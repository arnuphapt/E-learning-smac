"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { AlertTriangleIcon, BarChart3Icon, EyeIcon, LockIcon, LockOpenIcon, SettingsIcon, VideoIcon } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { hasRole } from "@/lib/roles"
import { bankWarning, lockSummary } from "@/lib/tutor-bank"
import { useConfirm } from "@/components/common/confirm"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LessonPanel } from "@/components/tutor/lesson-panel"
import { LessonRail } from "@/components/tutor/lesson-rail"
import type { TutorLessonItem } from "@/components/tutor/lesson-types"
import { getErrorMessage } from "@/components/tutor/sets"
import { TutorResults } from "@/components/tutor/tutor-results"
import { TutorSettings } from "@/components/tutor/tutor-settings"
import { toWorkspaceLesson, type BankStats, type WorkspaceLesson } from "@/components/tutor/workspace-data"

type CourseRow = Database["public"]["Tables"]["courses_all"]["Row"]
type Tab = "lessons" | "results" | "settings"

const newLessonId = () => "l_" + Date.now()

// The instructor workspace of one tutor set: lessons on the left (each with its bank health), the selected lesson on
// the right, set details + the access lock on a second tab. Replaces the course pages for tutor sets.
function Workspace() {
  const router = useRouter()
  const confirm = useConfirm()
  const rawCourseId = useParams()?.id
  const courseId = typeof rawCourseId === "string" ? rawCourseId : Array.isArray(rawCourseId) ? rawCourseId[0] : undefined
  const wanted = useSearchParams().get("lesson")
  const { data: session } = useSession()
  const user = session?.user
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [course, setCourse] = useState<CourseRow | null>(null)
  const [lessons, setLessons] = useState<WorkspaceLesson[]>([])
  const [bank, setBank] = useState<Record<string, BankStats>>({}) // lessonId -> { count, topics }
  const [sel, setSel] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("lessons")
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading")
  const canManage = hasRole(user?.role, "admin", "course_manager")

  useEffect(() => {
    if (!user || !courseId) return
    let cancelled = false
    ;(async () => {
      // courses_all, not the `courses` view: the view hides tutor sets.
      const [cRes, lRes, ciRes] = await Promise.all([
        supabase.from("courses_all").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("index", { ascending: true }),
        supabase.from("course_instructors").select("user_id").eq("course_id", courseId),
      ])
      if (cancelled) return
      const c = cRes.data
      if (!c) return setState("missing")
      if (c.kind !== "tutor") return router.replace("/i/course/" + courseId)

      const assigned = (ciRes.data || []).some((r) => r.user_id === user.id)
      const allowed =
        hasRole(user.role, "admin") ||
        (hasRole(user.role, "course_manager") && (c.group_id === user.group_id || Boolean(c.group_id && user.group_ids?.includes(c.group_id)) || assigned)) ||
        (hasRole(user.role, "instructor") && assigned)
      if (!allowed) {
        toast.error("คุณไม่มีสิทธิ์จัดการชุดติวนี้")
        return router.replace("/i/tutor")
      }

      const ls = (lRes.data || []).map(toWorkspaceLesson)
      const ids = ls.map((l) => l.id)
      const [qRes, tRes] = ids.length
        ? await Promise.all([
            supabase.from("questions").select("lesson_id, topic_id").eq("kind", "tutor").in("lesson_id", ids),
            supabase.from("tutor_topics").select("lesson_id").in("lesson_id", ids),
          ])
        : [{ data: [] }, { data: [] }]
      if (cancelled) return
      const b: Record<string, BankStats> = {}
      for (const l of ls) b[l.id] = { count: 0, topics: 0 }
      for (const q of qRes.data || []) {
        if (q.lesson_id && b[q.lesson_id]) b[q.lesson_id].count += 1
      }
      for (const t of tRes.data || []) {
        if (t.lesson_id && b[t.lesson_id]) b[t.lesson_id].topics += 1
      }
      setCourse(c)
      setLessons(ls)
      setBank(b)
      setSel(ls.some((l) => l.id === wanted) ? wanted : ls[0]?.id || null)
      setState("ready")
    })().catch((e: unknown) => {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + getErrorMessage(e))
      setState("missing")
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courseId])

  const patchLesson = (id: string, fields: Partial<WorkspaceLesson>) => setLessons((ls) => ls.map((l) => (l.id === id ? { ...l, ...fields } : l)))

  const saveLesson = (id: string) => async (fields: Partial<TutorLessonItem>) => {
    const updatePayload = fields as unknown as Database["public"]["Tables"]["lessons"]["Update"]
    const { error } = await supabase.from("lessons").update(updatePayload).eq("id", id)
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message)
      return false
    }
    patchLesson(id, fields)
    return true
  }

  const pick = (id: string) => {
    setSel(id)
    // narrow screens stack the rail above the panel: bring the panel into view
    if (!window.matchMedia("(min-width: 1024px)").matches) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  const addLesson = async () => {
    if (!courseId) return
    const row = {
      id: newLessonId(),
      course_id: courseId,
      index: Math.max(0, ...lessons.map((l) => l.index || 0)) + 1,
      title: "บทเรียนใหม่",
      description: "",
      status: "draft",
    }
    const { error } = await supabase.from("lessons").insert([row])
    if (error) {
      toast.error("เพิ่มบทเรียนไม่สำเร็จ: " + error.message)
      return
    }
    setLessons((ls) => [...ls, row])
    setBank((b) => ({ ...b, [row.id]: { count: 0, topics: 0 } }))
    setTab("lessons")
    pick(row.id)
  }

  const move = async (dir: number) => {
    const i = lessons.findIndex((l) => l.id === sel)
    const j = i + dir
    if (i < 0 || j < 0 || j >= lessons.length) return
    const [a, b] = [lessons[i], lessons[j]]
    const res = await Promise.all([
      supabase.from("lessons").update({ index: b.index }).eq("id", a.id),
      supabase.from("lessons").update({ index: a.index }).eq("id", b.id),
    ])
    if (res.some((r) => r.error)) {
      toast.error("จัดลำดับไม่สำเร็จ")
      return
    }
    setLessons((ls) => ls.map((l) => (l.id === a.id ? { ...l, index: b.index } : l.id === b.id ? { ...l, index: a.index } : l)).sort((x, y) => (x.index ?? 0) - (y.index ?? 0)))
  }

  const removeLesson = async () => {
    const l = lessons.find((x) => x.id === sel)
    if (!l) return
    const ok = await confirm({
      title: "ลบบทเรียน",
      message: `ลบบท “${l.title}” ใช่หรือไม่?\n\nข้อสอบในคลัง หัวข้อ และผลการทำข้อสอบของนักศึกษาในบทนี้จะถูกลบถาวร`,
      danger: true,
      confirmText: "ลบบทเรียน",
      cancelText: "ยกเลิก",
    })
    if (!ok) return
    const { error: qErr } = await supabase.from("questions").delete().eq("lesson_id", l.id)
    if (qErr) {
      toast.error("ลบไม่สำเร็จ: " + qErr.message)
      return
    }
    const { error } = await supabase.from("lessons").delete().eq("id", l.id)
    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message)
      return
    }
    const rest = lessons.filter((x) => x.id !== l.id)
    setLessons(rest)
    setSel(rest[0]?.id || null)
    toast.success("ลบบทเรียนแล้ว")
  }

  if (state === "loading") return <PageContainer><LoadingState /></PageContainer>
  if (state === "missing" || !course) {
    return (
      <PageContainer>
        <EmptyState
          icon={<AlertTriangleIcon />}
          title="ไม่พบชุดติว"
          action={
            <Button variant="outline" size="sm" onClick={() => router.push("/i/tutor")}>
              กลับไปรายการชุดติว
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const lock = lockSummary(course)
  const total = lessons.reduce((n, l) => n + (bank[l.id]?.count || 0), 0)
  const published = lessons.filter((l) => l.status === "active").length
  const short = lessons.filter((l) => bankWarning(bank[l.id]?.count || 0, l.tutor_draw_count)).length
  const current = lessons.find((l) => l.id === sel)
  const idx = lessons.findIndex((l) => l.id === sel)
  const stats = [`${lessons.length} บทเรียน`, `${published} เผยแพร่แล้ว`, `${total} ข้อในคลัง`, ...(short > 0 ? [`${short} บทคลังไม่พอ`] : [])].join(" · ")

  return (
    <PageContainer>
      <PageHeader
        kicker={`โหมดติว · ${course.code}`}
        title={course.title}
        description={stats}
        actions={
          <>
            <Button variant="outline" className={lock.open ? undefined : "text-warning hover:text-warning"} onClick={() => canManage && setTab("settings")} title={canManage ? "ไปที่การตั้งค่าการเข้าถึง" : undefined}>
              {lock.open ? <LockOpenIcon /> : <LockIcon />}
              {lock.text}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/s/tutor/" + course.id)}>
              <EyeIcon />
              ดูมุมมองนักศึกษา
            </Button>
          </>
        }
      />

      <Tabs value={tab === "settings" && !canManage ? "lessons" : tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="lessons">
            <VideoIcon />
            บทเรียนและคลังข้อสอบ
          </TabsTrigger>
          <TabsTrigger value="results">
            <BarChart3Icon />
            ผลการทำข้อสอบ
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="settings">
              <SettingsIcon />
              ตั้งค่าและการเข้าถึง
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lessons">
          <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <LessonRail lessons={lessons} bank={bank} selected={sel} onPick={pick} onAdd={addLesson} />
            <div ref={panelRef}>
              {current ? (
                <LessonPanel
                  key={current.id}
                  lesson={current}
                  bank={bank[current.id] || { count: 0, topics: 0 }}
                  save={saveLesson(current.id)}
                  onMove={move}
                  onDelete={removeLesson}
                  canUp={idx > 0}
                  canDown={idx < lessons.length - 1}
                />
              ) : (
                <EmptyState
                  icon={<VideoIcon />}
                  title="เริ่มจากบทแรก"
                  description="แต่ละบทมีวิดีโอ (ถ้ามี) และคลังข้อสอบของตัวเอง"
                  action={<Button onClick={addLesson}>เพิ่มบทเรียน</Button>}
                />
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="results">
          <TutorResults course={course} lessons={lessons} />
        </TabsContent>
        {canManage && (
          <TabsContent value="settings">
            <TutorSettings course={course} canManage={canManage} onSaved={(f) => setCourse((c) => (c ? { ...c, ...f, id: c.id } : c))} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  )
}

export default function InstructorTutorSet() {
  return (
    <Suspense fallback={<PageContainer><LoadingState /></PageContainer>}>
      <Workspace />
    </Suspense>
  )
}
