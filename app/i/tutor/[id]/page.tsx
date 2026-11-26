"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  AlertTriangleIcon,
  BarChart3Icon,
  BookOpenIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  PlusIcon,
  SettingsIcon,
  TriangleAlertIcon,
} from "lucide-react"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { hasRole } from "@/lib/roles"
import { bankWarning } from "@/lib/tutor-bank"
import { useConfirm } from "@/components/common/confirm"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { StatCards } from "@/components/common/stat-cards"
import { EmptyState, LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TutorLessonItem } from "@/components/tutor/lesson-types"
import { getErrorMessage } from "@/components/tutor/sets"
import { TutorLessonDialog } from "@/components/tutor/tutor-lesson-dialog"
import { TutorLessonList } from "@/components/tutor/tutor-lesson-list"
import { TutorResults } from "@/components/tutor/tutor-results"
import { TutorSettings } from "@/components/tutor/tutor-settings"
import { toWorkspaceLesson, type BankStats, type WorkspaceLesson } from "@/components/tutor/workspace-data"

type CourseRow = Database["public"]["Tables"]["courses_all"]["Row"]
type Tab = "lessons" | "results" | "settings"

const newLessonId = () => "l_" + Date.now()

// The instructor workspace of one tutor set: matches /i/course/[id] layout (PageHeader, StatCards, Tabs, full-width
// lesson reorder list, and modal lesson editor) while preserving tutor-specific rules (fail-closed lock, question bank,
// no Pre/Post-test or worksheets).
function Workspace() {
  const router = useRouter()
  const confirm = useConfirm()
  const rawCourseId = useParams()?.id
  const courseId = typeof rawCourseId === "string" ? rawCourseId : Array.isArray(rawCourseId) ? rawCourseId[0] : undefined
  const wanted = useSearchParams().get("lesson")
  const { data: session } = useSession()
  const user = session?.user

  const [course, setCourse] = useState<CourseRow | null>(null)
  const [lessons, setLessons] = useState<WorkspaceLesson[]>([])
  const [bank, setBank] = useState<Record<string, BankStats>>({}) // lessonId -> { count, topics }
  const [tab, setTab] = useState<Tab>("lessons")
  const [lessonModal, setLessonModal] = useState<{ mode: "create" } | { mode: "edit"; lessonId: string } | null>(null)
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
      if (wanted && ls.some((l) => l.id === wanted)) {
        setLessonModal({ mode: "edit", lessonId: wanted })
      }
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

  const saveLesson = async (id: string, fields: Partial<TutorLessonItem>) => {
    const updatePayload = fields as Database["public"]["Tables"]["lessons"]["Update"]
    const { error } = await supabase.from("lessons").update(updatePayload).eq("id", id)
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message)
      return false
    }
    patchLesson(id, fields)
    return true
  }

  const createLesson = async ({ title, description, status }: { title: string; description: string; status: string }) => {
    if (!courseId) return null
    const row: WorkspaceLesson = {
      id: newLessonId(),
      course_id: courseId,
      index: Math.max(0, ...lessons.map((l) => l.index || 0)) + 1,
      title,
      description,
      status,
    }
    const { error } = await supabase.from("lessons").insert([
      {
        id: row.id,
        course_id: courseId,
        index: row.index,
        title,
        description,
        status,
      },
    ])
    if (error) {
      toast.error("เพิ่มหมวดติวไม่สำเร็จ: " + error.message)
      return null
    }
    setLessons((ls) => [...ls, row])
    setBank((b) => ({ ...b, [row.id]: { count: 0, topics: 0 } }))
    setLessonModal({ mode: "edit", lessonId: row.id })
    toast.success("สร้างหมวดติวใหม่สำเร็จแล้ว")
    return row
  }

  const removeLesson = async (l: WorkspaceLesson) => {
    const ok = await confirm({
      title: "ลบหมวดติว",
      message: `ลบหมวดติว “${l.title}” ใช่หรือไม่?\n\nข้อสอบในคลัง หัวข้อ และผลการทำข้อสอบของนักศึกษาในหมวดนี้จะถูกลบถาวร`,
      danger: true,
      confirmText: "ลบหมวดติว",
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
    setLessons((ls) => ls.filter((x) => x.id !== l.id))
    setLessonModal((cur) => (cur?.mode === "edit" && cur.lessonId === l.id ? null : cur))
    toast.success("ลบหมวดติวแล้ว")
  }

  if (state === "loading") {
    return (
      <PageContainer>
        <LoadingState className="min-h-[60vh]" />
      </PageContainer>
    )
  }
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
          className="min-h-[60vh]"
        />
      </PageContainer>
    )
  }

  const total = lessons.reduce((n, l) => n + (bank[l.id]?.count || 0), 0)
  const published = lessons.filter((l) => l.status === "active").length
  const short = lessons.filter((l) => bankWarning(bank[l.id]?.count || 0, l.tutor_draw_count)).length
  const activeModalLesson = lessonModal?.mode === "edit" ? lessons.find((l) => l.id === lessonModal.lessonId) ?? null : null

  return (
    <PageContainer>
      <PageHeader
        kicker={course.term ? `โหมดติว · ${course.term}` : "โหมดติว"}
        title={course.title ?? ""}
        description={course.code ?? undefined}
      />

      <StatCards
        stats={[
          { label: "หมวดติว", value: lessons.length, icon: <BookOpenIcon /> },
          { label: "เผยแพร่แล้ว", value: published, icon: <CheckCircle2Icon /> },
          { label: "ข้อสอบในคลัง", value: total, icon: <ClipboardListIcon /> },
          { label: "หมวดคลังไม่พอ", value: short, icon: <TriangleAlertIcon />, tone: short > 0 ? "warning" : undefined },
        ]}
      />

      <Tabs value={tab === "settings" && !canManage ? "lessons" : tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="lessons">
              <BookOpenIcon />
              หมวดติว
            </TabsTrigger>
            <TabsTrigger value="results">
              <BarChart3Icon />
              ผลการทำข้อสอบ
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="settings">
                <SettingsIcon />
                ตั้งค่าชุดติว
              </TabsTrigger>
            )}
          </TabsList>
          {tab === "lessons" && (
            <Button onClick={() => setLessonModal({ mode: "create" })}>
              <PlusIcon />
              เพิ่มหมวดติว
            </Button>
          )}
        </div>

        <TabsContent value="lessons">
          <TutorLessonList
            lessons={lessons}
            bank={bank}
            onCreate={() => setLessonModal({ mode: "create" })}
            onEdit={(l) => setLessonModal({ mode: "edit", lessonId: l.id })}
            onDelete={removeLesson}
          />
        </TabsContent>
        <TabsContent value="results">
          <TutorResults course={course} lessons={lessons} />
        </TabsContent>
        {canManage && (
          // forceMount keeps unsaved edits when switching tabs
          <TabsContent value="settings" forceMount className="grid gap-4 data-[state=inactive]:hidden">
            <TutorSettings course={course} canManage={canManage} onSaved={(f) => setCourse((c) => (c ? { ...c, ...f, id: c.id } : c))} />
          </TabsContent>
        )}
      </Tabs>

      {lessonModal && (
        <TutorLessonDialog
          key={lessonModal.mode === "edit" ? lessonModal.lessonId : "new"}
          courseCode={course.code}
          lesson={activeModalLesson}
          bank={activeModalLesson ? bank[activeModalLesson.id] || { count: 0, topics: 0 } : { count: 0, topics: 0 }}
          onCreate={createLesson}
          onSave={saveLesson}
          onClose={() => setLessonModal(null)}
        />
      )}
    </PageContainer>
  )
}

export default function InstructorTutorSet() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <LoadingState className="min-h-[60vh]" />
        </PageContainer>
      }
    >
      <Workspace />
    </Suspense>
  )
}
