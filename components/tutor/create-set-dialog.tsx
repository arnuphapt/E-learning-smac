"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AwardIcon, CheckIcon, CircleCheckIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { DEFAULT_DOMAIN } from "@/lib/course-access"
import type { Json } from "@/lib/database.types"
import { hasRole } from "@/lib/roles"
import { lockSummary } from "@/lib/tutor-bank"
import { cn } from "@/lib/utils"
import { FormField } from "@/components/common/form-field"
import { ManagerSelect, type UserRow } from "@/components/common/manager-select"
import { LoadingState } from "@/components/common/states"
import type { SectionRow, SubjectGroupRow, TermRow } from "@/components/course/draft"
import { SectionSelect } from "@/components/course/section-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "./sets"
import { yearOptionsOf, type YearOption } from "./settings-lookup"

const TUTOR_HERO = "#0d6e8c"
const NONE = "__none__"

type SubjectGroupManagerRow = { user_id: string; group_id: string }

interface CreatorUser {
  id?: string
  name?: string | null
  role?: string | null
  group_id?: string | null
  group_ids?: string[] | null
}

interface TutorSetDraft {
  title: string
  code: string
  subtitle: string
  term: string
  subjectGroup: string
  section: string
  yearLevels: number[]
  mainManagers: string[] | null
  coInstructors: string[]
}

// New tutor set: 3-section modal (info, group/term/section, staff & fail-closed lock), then straight into its workspace.
export function CreateSetDialog({ user, onClose }: { user: CreatorUser; onClose: () => void }) {
  const router = useRouter()
  const isCourseManagerOnly = hasRole(user.role, "course_manager") && !hasRole(user.role, "admin")

  const [draft, setDraft] = useState<TutorSetDraft>({
    title: "",
    code: "",
    subtitle: "",
    term: "",
    subjectGroup: "",
    section: "",
    yearLevels: [],
    mainManagers: null,
    coInstructors: [],
  })
  const patch = (p: Partial<TutorSetDraft>) => setDraft((d) => ({ ...d, ...p }))

  const [terms, setTerms] = useState<TermRow[]>([])
  const [instructors, setInstructors] = useState<UserRow[]>([])
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupRow[]>([])
  const [sections, setSections] = useState<SectionRow[]>([])
  const [groupManagers, setGroupManagers] = useState<SubjectGroupManagerRow[]>([])
  const [yearOptions, setYearOptions] = useState<YearOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const mainManagers = draft.mainManagers ?? (user.id ? [user.id] : [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [tRes, uRes, gRes, sRes, sgmRes, gradeRes] = await Promise.all([
        supabase.from("terms").select("*"),
        supabase.from("users").select("*").or("role.like.%instructor%,role.like.%admin%,role.like.%course_manager%"),
        supabase.from("subject_groups").select("*").eq("status", "active"),
        supabase.from("sections").select("*").eq("status", "active"),
        supabase.from("subject_group_managers").select("*"),
        supabase.from("student_grades").select("prefix, year_label, domain, year_no"),
      ])
      if (cancelled) return

      const fetchedTerms = tRes.data || []
      const fetchedGroups = gRes.data || []
      const fetchedGroupManagers = sgmRes.data || []

      setTerms(fetchedTerms)
      setInstructors(uRes.data || [])
      setSubjectGroups(fetchedGroups)
      setSections(sRes.data || [])
      setGroupManagers(fetchedGroupManagers)
      setYearOptions(yearOptionsOf(gradeRes.data || []))

      let subjectGroup = ""
      if (isCourseManagerOnly) {
        const myDbGroups = fetchedGroupManagers.filter((sgm) => sgm.user_id === user.id).map((sgm) => sgm.group_id)
        subjectGroup = myDbGroups[0] || user.group_id || user.group_ids?.[0] || fetchedGroups[0]?.id || ""
      } else if (fetchedGroups.length > 0) {
        subjectGroup = fetchedGroups[0].id
      }

      // Tutor sets fail closed: `section` intentionally stays "" so no student enters until the instructor locks it.
      setDraft((d) => ({
        ...d,
        term: fetchedTerms.length > 0 ? `${fetchedTerms[0].name} ${fetchedTerms[0].year}` : d.term,
        subjectGroup: subjectGroup || d.subjectGroup,
      }))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isCourseManagerOnly, user.group_id, user.group_ids, user.id])

  const myManagedGroupIds = useMemo(() => {
    if (hasRole(user.role, "admin")) return subjectGroups.map((g) => g.id)
    const ids = new Set(groupManagers.filter((sgm) => sgm.user_id === user.id).map((sgm) => sgm.group_id))
    if (user.group_id) ids.add(user.group_id)
    for (const gid of user.group_ids || []) {
      if (gid) ids.add(gid)
    }
    return Array.from(ids)
  }, [groupManagers, subjectGroups, user.group_id, user.group_ids, user.id, user.role])

  const filteredGroups = hasRole(user.role, "admin") ? subjectGroups : subjectGroups.filter((g) => myManagedGroupIds.includes(g.id))

  const lock = lockSummary({
    kind: "tutor",
    section: draft.section || null,
    year_level: draft.yearLevels,
    access: { allowedEmails: [] },
  })

  const readinessHint = loading
    ? "กำลังโหลดข้อมูลเริ่มต้น…"
    : !draft.title.trim() || !draft.code.trim()
      ? "กรุณากรอกชื่อชุดติวและรหัสชุด"
      : mainManagers.length === 0
        ? "กรุณาเลือกอาจารย์ผู้รับผิดชอบหลักอย่างน้อย 1 คน"
        : null

  const toggleYear = (value: number) => {
    patch({
      yearLevels: draft.yearLevels.includes(value)
        ? draft.yearLevels.filter((y) => y !== value)
        : [...draft.yearLevels, value].sort((a, b) => a - b),
    })
  }

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (saving) return
    const userId = user.id
    if (!userId) return
    if (!draft.title.trim() || !draft.code.trim()) {
      toast.warning("กรุณากรอกชื่อชุดติวและรหัสชุด")
      return
    }
    if (mainManagers.length === 0) {
      toast.warning("กรุณาเลือกอาจารย์ผู้รับผิดชอบหลักอย่างน้อย 1 คน")
      return
    }
    setSaving(true)
    try {
      let selectedYear: string | number = new Date().getFullYear() + 543
      const selectedTermObj = terms.find((t) => `${t.name} ${t.year}` === draft.term)
      if (selectedTermObj?.year) selectedYear = selectedTermObj.year

      const selectedGroup = subjectGroups.find((g) => g.id === draft.subjectGroup)
      const mainManagerNames = mainManagers.map((id) => instructors.find((u) => u.id === id)?.name).filter((n): n is string => Boolean(n))
      const mainManagerName = mainManagerNames.length > 0 ? mainManagerNames.join(", ") : user.name || null

      const row = {
        id: "c_" + Date.now(),
        code: draft.code.trim(),
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        term: draft.term || "",
        year: String(selectedYear),
        instructor: mainManagerName,
        group_id: draft.subjectGroup || null,
        group_name: selectedGroup?.name || null,
        section: draft.section || null,
        lessons: 0,
        students: 0,
        progress: 0,
        hero: TUTOR_HERO,
        year_level: draft.yearLevels,
        access: { allowedYears: [], allowedEmails: [] } as Json,
        kind: "tutor",
      }
      // courses_all, not the `courses` view: the view's WITH CHECK OPTION rejects kind = 'tutor' rows.
      const { error } = await supabase.from("courses_all").insert([row])
      if (error) throw error

      const uniqueUserIds = new Set<string>([...mainManagers, ...draft.coInstructors, userId])
      const linkRows = Array.from(uniqueUserIds, (uid) => ({ course_id: row.id, user_id: uid }))
      if (linkRows.length > 0) {
        const { error: linkErr } = await supabase.from("course_instructors").insert(linkRows)
        if (linkErr) console.error("Error linking course instructor:", linkErr)
      }

      toast.success("สร้างชุดติวเรียบร้อยแล้ว")
      router.push("/i/tutor/" + row.id)
    } catch (err: unknown) {
      toast.error("สร้างชุดติวไม่สำเร็จ: " + getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
        <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={create}>
          <DialogHeader className="shrink-0 border-b border-border/80 bg-card px-6 py-4 pr-14 text-left">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <AwardIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold tracking-tight">สร้างชุดติวใหม่</DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                  กรอกข้อมูลพื้นฐานและสิทธิ์การเข้าถึงของชุดติว จากนั้นจึงเพิ่มหมวดติวและคลังข้อสอบต่อได้ทันที
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="modal-scroll flex-1 overflow-y-auto bg-card px-6 py-5">
            {loading ? (
              <LoadingState className="min-h-60" />
            ) : (
              <div className="space-y-6">
                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">ข้อมูลชุดติว</h3>
                    <p className="text-xs text-muted-foreground">ชื่อ รหัสชุด และคำอธิบายที่นักศึกษาจะเห็นบนการ์ดชุดติว</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <FormField label="ชื่อชุดติว" htmlFor="new-set-title" required>
                      <Input
                        id="new-set-title"
                        value={draft.title}
                        onChange={(e) => patch({ title: e.target.value })}
                        placeholder="เช่น ติวสอบรวบยอด การพยาบาลผู้ใหญ่ 1"
                        required
                        aria-required="true"
                        autoFocus
                      />
                    </FormField>
                    <FormField label="รหัสชุด" htmlFor="new-set-code" required>
                      <Input
                        id="new-set-code"
                        className="font-mono"
                        value={draft.code}
                        onChange={(e) => patch({ code: e.target.value })}
                        placeholder="เช่น NUR301-TUTOR"
                        required
                        aria-required="true"
                      />
                    </FormField>
                  </div>

                  <FormField label="คำอธิบายชุดติว" htmlFor="new-set-subtitle">
                    <Textarea
                      id="new-set-subtitle"
                      rows={2}
                      className="min-h-20"
                      value={draft.subtitle}
                      onChange={(e) => patch({ subtitle: e.target.value })}
                      placeholder="ติวเรื่องอะไร เน้นหัวข้อไหน หรือเตรียมสอบอะไร…"
                    />
                  </FormField>
                </section>

                <Separator />

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">ภาคเรียนและการจัดกลุ่ม</h3>
                    <p className="text-xs text-muted-foreground">กำหนดกลุ่มวิชา ภาคเรียน และกลุ่มเรียนของชุดติวนี้</p>
                  </div>

                  <FormField label="กลุ่มวิชา" htmlFor="new-set-group">
                    {filteredGroups.length === 0 ? (
                      <Select disabled>
                        <SelectTrigger id="new-set-group" className="w-full">
                          <SelectValue placeholder="— ยังไม่มีกลุ่มวิชา กรุณาเพิ่มในระบบหลักก่อน —" />
                        </SelectTrigger>
                      </Select>
                    ) : (
                      <Select
                        value={draft.subjectGroup || NONE}
                        onValueChange={(v) => patch({ subjectGroup: v === NONE ? "" : v, coInstructors: [] })}
                        disabled={isCourseManagerOnly && filteredGroups.length <= 1}
                      >
                        <SelectTrigger id="new-set-group" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>เลือกกลุ่มวิชา</SelectItem>
                          {filteredGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="ภาคเรียน" htmlFor="new-set-term">
                      {terms.length === 0 ? (
                        <Select disabled>
                          <SelectTrigger id="new-set-term" className="w-full">
                            <SelectValue placeholder="— ไม่มีข้อมูลภาคเรียน —" />
                          </SelectTrigger>
                        </Select>
                      ) : (
                        <Select value={draft.term} onValueChange={(v) => patch({ term: v })}>
                          <SelectTrigger id="new-set-term" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {terms.map((t) => (
                              <SelectItem key={t.id} value={`${t.name} ${t.year}`}>
                                {t.name} {t.year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormField>
                    <FormField label="กลุ่มเรียน / Section" htmlFor="new-set-section">
                      {sections.length === 0 ? (
                        <Select disabled>
                          <SelectTrigger id="new-set-section" className="w-full">
                            <SelectValue placeholder="— ยังไม่มี Section —" />
                          </SelectTrigger>
                        </Select>
                      ) : (
                        <SectionSelect id="new-set-section" value={draft.section} onChange={(v) => patch({ section: v })} sections={sections} />
                      )}
                    </FormField>
                  </div>
                </section>

                <Separator />

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">อาจารย์ผู้สอนและสิทธิ์การเข้าถึง</h3>
                    <p className="text-xs text-muted-foreground">กำหนดอาจารย์ผู้รับผิดชอบ ผู้สอนร่วม และชั้นปีที่เข้าชุดติวนี้ได้</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="อาจารย์ผู้รับผิดชอบหลัก" htmlFor="new-set-main-managers" required>
                      <ManagerSelect
                        id="new-set-main-managers"
                        options={instructors.filter((u) => !draft.coInstructors.includes(u.id))}
                        selectedValues={mainManagers}
                        onChange={(v) => patch({ mainManagers: v })}
                        placeholder="เลือกอาจารย์ผู้รับผิดชอบหลัก..."
                      />
                    </FormField>
                    <FormField label="อาจารย์ผู้สอนร่วม (เลือกได้หลายคน)" htmlFor="new-set-co-instructors">
                      <ManagerSelect
                        id="new-set-co-instructors"
                        options={instructors.filter((u) => !mainManagers.includes(u.id))}
                        selectedValues={draft.coInstructors}
                        onChange={(v) => patch({ coInstructors: v })}
                        placeholder="เลือกอาจารย์ผู้สอนร่วม..."
                      />
                    </FormField>
                  </div>

                  <fieldset className="grid gap-3 rounded-xl border border-border/80 bg-muted/25 p-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <legend className="text-sm font-medium text-foreground">ชั้นปีที่เข้าถึงได้</legend>
                      <span className="text-xs text-muted-foreground">ไม่เลือก = ยังไม่เปิดให้นักศึกษาเห็น</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {yearOptions.length === 0 ? (
                        <span className="text-sm text-muted-foreground">ยังไม่มีข้อมูลชั้นปีในระบบ</span>
                      ) : (
                        yearOptions.map(({ label, value, domain }) => {
                          const checked = draft.yearLevels.includes(value)
                          const inputId = `new-set-year-${value}`
                          return (
                            <Label
                              key={value}
                              htmlFor={inputId}
                              className={cn(
                                "min-h-9 cursor-pointer rounded-lg border bg-card px-3 py-1.5 text-sm transition-colors",
                                checked
                                  ? "border-primary bg-primary-soft/60 font-semibold text-primary-soft-foreground shadow-xs"
                                  : "border-border font-normal text-foreground hover:border-primary/40 hover:bg-card",
                              )}
                            >
                              <Checkbox id={inputId} checked={checked} onCheckedChange={() => toggleYear(value)} />
                              <span>{label}</span>
                              {domain !== DEFAULT_DOMAIN && <span className="text-xs text-muted-foreground">({domain})</span>}
                            </Label>
                          )
                        })
                      )}
                    </div>

                    <div
                      role="status"
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                        lock.open ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
                      )}
                    >
                      {lock.open ? (
                        <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0" />
                      ) : (
                        <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                      )}
                      <span>
                        {lock.open ? `เข้าได้: ${lock.text}` : `${lock.text} (สามารถตั้งค่าหรือเพิ่มรายชื่อพิเศษภายหลังได้)`}
                      </span>
                    </div>
                  </fieldset>
                </section>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/35 px-6 py-3.5 sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              {readinessHint ? (
                <span className="text-muted-foreground">{readinessHint}</span>
              ) : (
                <>
                  <span aria-hidden className="size-2 rounded-full bg-success" />
                  <span className="font-medium text-success">พร้อมสร้างชุดติว</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={loading || saving || !draft.title.trim() || !draft.code.trim() || mainManagers.length === 0}
              >
                {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                สร้างและเปิดชุดนี้
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
