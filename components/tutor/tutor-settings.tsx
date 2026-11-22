"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import type { Database, Json } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { canStudentAccessTutorSet, type CourseAccessInput } from "@/lib/course-access"
import { isTutorOnlyRole } from "@/lib/roles"
import { lockSummary } from "@/lib/tutor-bank"
import { useConfirm } from "@/components/common/confirm"
import { Button } from "@/components/ui/button"
import { PickerDialog } from "./picker-dialog"
import { SettingsAccessCard } from "./settings-access-card"
import { SettingsInfoCard } from "./settings-info-card"
import { getAllowedEmails, HERO_COLORS, normYears, sameList, useTutorLookup, type TutorCourse } from "./settings-lookup"
import { SettingsStaffCard } from "./settings-staff-card"

// Set details and the lock (who can enter). Tutor sets fail closed: with no year / section / email the set is open to
// nobody, and the live count below is computed with the same rule the API enforces (canStudentAccessTutorSet).
// canManage (admin / course_manager) also edits the responsible instructors and may delete the set.
export function TutorSettings({
  course,
  canManage,
  onSaved,
}: {
  course: TutorCourse
  canManage: boolean
  onSaved: (fields: Database["public"]["Tables"]["courses_all"]["Update"]) => void
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const [title, setTitle] = useState(course.title || "")
  const [subtitle, setSubtitle] = useState(course.subtitle || "")
  const [hero, setHero] = useState(course.hero || HERO_COLORS[0])
  const [years, setYears] = useState(normYears(course.year_level))
  const [section, setSection] = useState(course.section || "")
  const [emails, setEmails] = useState(getAllowedEmails(course.access))
  const [mains, setMains] = useState<string[]>([])
  const [picker, setPicker] = useState<"emails" | "mains" | "co" | null>(null)
  const [saving, setSaving] = useState(false)
  const [lookup, setLookup] = useTutorLookup(course, setMains)

  const baseAccess =
    course.access && typeof course.access === "object" && !Array.isArray(course.access) ? (course.access as Record<string, unknown>) : {}
  const draftAccess: Json = { ...(baseAccess as Record<string, Json>), allowedEmails: emails }
  const draft: CourseAccessInput = { kind: "tutor", section: section || null, year_level: years, access: draftAccess }
  const lock = lockSummary(draft)
  const reach = useMemo(() => {
    if (!lookup) return null
    return lookup.students.filter((s) =>
      canStudentAccessTutorSet(draft, { email: s.email, studentNo: s.student_no, section: s.section, studyYear: s.study_year, tutorOnly: isTutorOnlyRole(s.role) }, lookup.sections, lookup.grades),
    ).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, section, years, emails])

  const dirty =
    title !== (course.title || "") ||
    subtitle !== (course.subtitle || "") ||
    hero !== (course.hero || HERO_COLORS[0]) ||
    section !== (course.section || "") ||
    !sameList(years, normYears(course.year_level)) ||
    !sameList(emails, getAllowedEmails(course.access)) ||
    Boolean(canManage && lookup && !sameList(mains, lookup.mainIds))

  const save = async () => {
    if (!title.trim()) {
      toast.warning("กรุณากรอกชื่อชุดติว")
      return
    }
    setSaving(true)
    try {
      const fields: Database["public"]["Tables"]["courses_all"]["Update"] = {
        title: title.trim(),
        subtitle,
        hero,
        year_level: years,
        section: section || null,
        access: draftAccess,
      }
      if (canManage && lookup && mains.length > 0) {
        fields.instructor = mains.map((id) => lookup.staff.find((u) => u.id === id)?.name).filter(Boolean).join(", ")
      }
      const { error } = await supabase.from("courses_all").update(fields).eq("id", course.id)
      if (error) throw error
      if (canManage && lookup) {
        const missing = mains.filter((id) => !lookup.assigned.includes(id))
        if (missing.length) {
          await supabase.from("course_instructors").insert(missing.map((user_id) => ({ course_id: course.id, user_id })))
          setLookup((l) => (l ? { ...l, assigned: [...l.assigned, ...missing] } : l))
        }
        setLookup((l) => (l ? { ...l, mainIds: mains } : l))
      }
      onSaved(fields)
      toast.success("บันทึกชุดติวแล้ว")
    } catch (err: unknown) {
      toast.error("บันทึกไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const saveCo = async (ids: string[]) => {
    if (!lookup) return
    const current = lookup.assigned.filter((id) => !mains.includes(id))
    const add = ids.filter((id) => !current.includes(id))
    const del = current.filter((id) => !ids.includes(id))
    if (add.length) {
      const { error } = await supabase.from("course_instructors").insert(add.map((user_id) => ({ course_id: course.id, user_id })))
      if (error) {
        toast.error("เพิ่มผู้สอนร่วมไม่สำเร็จ: " + error.message)
        return
      }
    }
    if (del.length) {
      const { error } = await supabase.from("course_instructors").delete().eq("course_id", course.id).in("user_id", del)
      if (error) {
        toast.error("ถอดผู้สอนร่วมไม่สำเร็จ: " + error.message)
        return
      }
    }
    setLookup((l) => (l ? { ...l, assigned: [...l.assigned.filter((id) => !del.includes(id)), ...add] } : l))
    setPicker(null)
    toast.success("อัปเดตผู้สอนร่วมแล้ว")
  }

  const remove = async () => {
    const ok = await confirm({
      title: "ลบชุดติว",
      message: `ลบชุดติว “${course.title}” (${course.code}) ใช่หรือไม่?\n\nบทเรียน คลังข้อสอบ และผลการทำข้อสอบของนักศึกษาในชุดนี้จะถูกลบถาวร กู้คืนไม่ได้`,
      danger: true,
      confirmText: "ลบชุดติว",
      cancelText: "ยกเลิก",
    })
    if (!ok) return
    try {
      const { data: ls } = await supabase.from("lessons").select("id").eq("course_id", course.id)
      const ids = (ls || []).map((l) => l.id)
      if (ids.length) {
        const { error: qErr } = await supabase.from("questions").delete().in("lesson_id", ids)
        if (qErr) throw qErr
        const { error: lErr } = await supabase.from("lessons").delete().in("id", ids)
        if (lErr) throw lErr
      }
      const { error } = await supabase.from("courses_all").delete().eq("id", course.id)
      if (error) throw error
      toast.success("ลบชุดติวแล้ว")
      router.push("/i/tutor")
    } catch (err: unknown) {
      toast.error("ลบไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const nameOf = (id: string) => lookup?.staff.find((u) => u.id === id)?.name || id
  const co = (lookup?.assigned || []).filter((id) => !mains.includes(id))

  return (
    <div className="grid max-w-4xl gap-4">
      <SettingsInfoCard code={course.code} title={title} onTitle={setTitle} subtitle={subtitle} onSubtitle={setSubtitle} hero={hero} onHero={setHero} />
      <SettingsAccessCard
        lookup={lookup}
        lock={lock}
        reach={reach}
        years={years}
        onYears={setYears}
        section={section}
        onSection={setSection}
        emails={emails}
        onEmails={setEmails}
        onPickEmails={() => setPicker("emails")}
      />
      {canManage && <SettingsStaffCard mains={mains} co={co} nameOf={nameOf} disabled={!lookup} onPickMains={() => setPicker("mains")} onPickCo={() => setPicker("co")} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {canManage ? (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={remove}>
            <Trash2Icon />
            ลบชุดติวนี้
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          {saving ? "กำลังบันทึก…" : "บันทึกชุดติว"}
        </Button>
      </div>

      {picker === "emails" && lookup && (
        <PickerDialog
          title="รายชื่อพิเศษ"
          desc="นักศึกษาที่เลือกจะเข้าชุดนี้ได้ แม้ไม่ตรงชั้นปีหรือกลุ่มเรียน (ใช้กับอีเมลเก่าหรือกรณีพิเศษ)"
          items={lookup.students.map((s) => ({ id: s.email || "", label: s.name, sub: [s.student_no, s.email].filter(Boolean).join(" · ") }))}
          selected={emails}
          onClose={() => setPicker(null)}
          onSave={(ids) => {
            setEmails(ids)
            setPicker(null)
          }}
        />
      )}
      {picker === "mains" && lookup && (
        <PickerDialog
          title="อาจารย์ผู้รับผิดชอบหลัก"
          items={lookup.staff.map((u) => ({ id: u.id, label: u.name, sub: u.email }))}
          selected={mains}
          onClose={() => setPicker(null)}
          onSave={(ids) => {
            setMains(ids)
            setPicker(null)
          }}
        />
      )}
      {picker === "co" && lookup && (
        <PickerDialog
          title="อาจารย์ผู้สอนร่วม"
          desc="เห็นและแก้ชุดนี้ได้ แต่ไม่แก้ผู้รับผิดชอบหลัก"
          items={lookup.staff.filter((u) => !mains.includes(u.id)).map((u) => ({ id: u.id, label: u.name, sub: u.email }))}
          selected={co}
          onClose={() => setPicker(null)}
          onSave={saveCo}
        />
      )}
    </div>
  )
}
