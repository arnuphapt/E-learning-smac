"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useConfirm } from "@/components/common/confirm"
import { deleteLessonCascade } from "@/components/course/actions"
import {
  errMsg,
  parseTestConfig,
  type AssignmentRow,
  type CourseAllRow,
  type LessonRow,
  type LessonTab,
  type LessonUpdate,
  type QuestionRow,
  type RubricRow,
} from "@/components/lesson/types"

export interface LessonBundleData {
  questions: QuestionRow[]
  assignments: AssignmentRow[]
  rubrics: RubricRow[]
}

export interface SaveState {
  status: "idle" | "saving" | "saved" | "dirty"
  savedAt?: string
}

const formatNowHHMM = () =>
  new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })

const TEST_DEFAULTS = {
  required: false,
  passing_score: 50,
  time_limit: 30,
  attempts: "1",
  shuffle: true,
  show_answers: true,
  due: null,
  due_time: "23:59",
}

export function useLessonEditor({
  lessonId,
  queryCourseId,
  redirectOnTutor = false,
  onChanged,
}: {
  lessonId?: string | null
  queryCourseId?: string | null
  /** Page mode redirects tutor lessons to /i/tutor/[id] and handles lessonId === "new". */
  redirectOnTutor?: boolean
  onChanged?: () => void
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const { status } = useSession()

  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [course, setCourse] = useState<Partial<CourseAllRow> | null>(null)
  const [loading, setLoading] = useState(Boolean(lessonId))
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState<LessonBundleData>({ questions: [], assignments: [], rubrics: [] })
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" })

  const markDirty = useCallback(() => {
    setSaveState((prev) => ({ status: "dirty", savedAt: prev.savedAt }))
  }, [])

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
    onChanged?.()
  }, [onChanged])

  useEffect(() => {
    if (!lessonId || status === "loading") return

    let cancelled = false
    const load = async () => {
      if (lessonId === "new" && redirectOnTutor) {
        if (!queryCourseId) {
          if (!cancelled) setLoading(false)
          return
        }
        // a tutor set gets its lessons from the tutor workspace
        const { data: target } = await supabase.from("courses_all").select("kind").eq("id", queryCourseId).maybeSingle()
        if (target?.kind === "tutor") {
          router.replace("/i/tutor/" + queryCourseId)
          return
        }
        const { data: existingLessons } = await supabase.from("lessons").select("id").eq("course_id", queryCourseId)
        const newId = "l_" + Date.now()
        const { error } = await supabase.from("lessons").insert([
          {
            id: newId,
            course_id: queryCourseId,
            title: "บทเรียนใหม่",
            description: "",
            duration: "",
            status: "draft",
            index: existingLessons ? existingLessons.length + 1 : 1,
            video: false,
            pretest: TEST_DEFAULTS,
            posttest: TEST_DEFAULTS,
            assignment: null,
            watch_limit: false,
            allow_download: true,
            allow_ai: true,
            has_docs: true,
            has_pretest: true,
            has_posttest: true,
            has_assignment: true,
          },
        ])
        if (cancelled) return
        if (error) {
          toast.error("เกิดข้อผิดพลาดในการสร้างบทเรียน: " + error.message)
          setLoading(false)
        } else {
          router.replace(`/i/lesson/${newId}`)
        }
        return
      }

      const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single()
      if (cancelled) return
      if (!lData) {
        setLoading(false)
        return
      }

      // courses_all, not the `courses` view: the view hides tutor sets (course would be empty -> broken links).
      const { data: cData } = lData.course_id ? await supabase.from("courses_all").select("*").eq("id", lData.course_id).single() : { data: null }
      if (cancelled) return
      // tutor lessons are edited in the tutor workspace, never in the course lesson editor
      if (redirectOnTutor && cData?.kind === "tutor") {
        router.replace("/i/tutor/" + cData.id + "?lesson=" + lessonId)
        return
      }

      const [qRes, aRes, rRes] = await Promise.all([
        supabase.from("questions").select("*").eq("lesson_id", lessonId).order("no", { ascending: true }),
        supabase.from("assignments").select("*").eq("lesson_id", lessonId),
        supabase.from("rubrics").select("*"),
      ])
      if (cancelled) return

      setLesson(lData)
      setCourse(cData || { code: "", title: "" })
      setData({ questions: qRes.data || [], assignments: aRes.data || [], rubrics: rRes.data || [] })
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [lessonId, queryCourseId, redirectOnTutor, status, reloadKey, router])

  const patchLesson = useCallback((fields: Partial<LessonRow>) => {
    setLesson((prev) => (prev ? ({ ...prev, ...fields } as LessonRow) : prev))
  }, [])

  const saveDetails = useCallback(
    async (updatedFields: LessonUpdate, silent = false) => {
      if (!lessonId || !lesson) return

      // A required pre/post-test (or publishing) needs at least one question.
      const hasPretestUpdate = Object.prototype.hasOwnProperty.call(updatedFields, "pretest")
      const hasPosttestUpdate = Object.prototype.hasOwnProperty.call(updatedFields, "posttest")
      const isPublishing = updatedFields.status === "active"
      const checks = [
        { touched: hasPretestUpdate, kind: "pre", label: "Pre-test", config: hasPretestUpdate ? updatedFields.pretest : lesson.pretest },
        { touched: hasPosttestUpdate, kind: "post", label: "Post-test", config: hasPosttestUpdate ? updatedFields.posttest : lesson.posttest },
      ] as const
      for (const c of checks) {
        if ((c.touched || isPublishing) && parseTestConfig(c.config).required && data.questions.filter((q) => q.kind === c.kind).length === 0) {
          if (!silent) toast.warning(`กรุณาเพิ่มข้อสอบ ${c.label} อย่างน้อย 1 ข้อ ก่อนเปิดใช้งาน (ตั้งค่าให้จำเป็น)`)
          return
        }
      }

      const wasDraft = lesson.title === "บทเรียนใหม่" || lesson.title === ""
      setSaveState((prev) => ({ status: "saving", savedAt: prev.savedAt }))
      const { error } = await supabase.from("lessons").update(updatedFields).eq("id", lessonId)
      if (error) {
        setSaveState((prev) => ({ status: "dirty", savedAt: prev.savedAt }))
        if (!silent) toast.error("เกิดข้อผิดพลาดในการบันทึก: " + error.message)
        return
      }
      setLesson((prev) => (prev ? ({ ...prev, ...updatedFields } as LessonRow) : prev))
      setSaveState({ status: "saved", savedAt: formatNowHHMM() })
      if (!silent) toast.success(wasDraft ? "สร้างบทเรียนสำเร็จ" : "บันทึกรายละเอียดบทเรียนเรียบร้อยแล้ว")
      onChanged?.()
    },
    [lessonId, lesson, data.questions, onChanged],
  )

  const createLesson = useCallback(
    async ({
      courseId,
      title,
      description = "",
      status: nextStatus,
      lessonsCount,
      has_docs = true,
      has_pretest = true,
      has_posttest = true,
      has_assignment = true,
      allow_ai = true,
      watch_limit = false,
    }: {
      courseId: string
      title: string
      description?: string
      status: string
      lessonsCount?: number
      has_docs?: boolean
      has_pretest?: boolean
      has_posttest?: boolean
      has_assignment?: boolean
      allow_ai?: boolean
      watch_limit?: boolean
    }) => {
      setSaveState((prev) => ({ status: "saving", savedAt: prev.savedAt }))
      let nextIndex = (lessonsCount ?? 0) + 1
      if (lessonsCount === undefined) {
        const { data: existing } = await supabase.from("lessons").select("id").eq("course_id", courseId)
        nextIndex = existing ? existing.length + 1 : 1
      }

      const newId = "l_" + Date.now()
      const { error } = await supabase.from("lessons").insert([
        {
          id: newId,
          course_id: courseId,
          title,
          description,
          duration: "",
          status: nextStatus,
          index: nextIndex,
          video: false,
          pretest: TEST_DEFAULTS,
          posttest: TEST_DEFAULTS,
          assignment: null,
          watch_limit,
          allow_download: true,
          allow_ai,
          has_docs,
          has_pretest,
          has_posttest,
          has_assignment,
        },
      ])
      if (error) {
        setSaveState((prev) => ({ status: "dirty", savedAt: prev.savedAt }))
        toast.error("เกิดข้อผิดพลาดในการสร้างบทเรียน: " + error.message)
        return null
      }
      setSaveState({ status: "saved", savedAt: formatNowHHMM() })
      toast.success("สร้างบทเรียนใหม่สำเร็จแล้ว")
      onChanged?.()
      return newId
    },
    [onChanged],
  )

  const deleteLesson = useCallback(async () => {
    if (!lesson) return false
    const confirmed = await confirm({
      title: "ลบบทเรียน",
      message: `คุณต้องการลบบทเรียน "บทที่ ${lesson.index}: ${lesson.title}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`,
      danger: true,
      confirmText: "ลบบทเรียน",
      cancelText: "ยกเลิก",
    })
    if (!confirmed) return false
    try {
      await deleteLessonCascade(lesson.id)
      toast.success("ลบบทเรียนเรียบร้อยแล้ว")
      onChanged?.()
      return true
    } catch (error: unknown) {
      console.error("Error deleting lesson:", error)
      toast.error("เกิดข้อผิดพลาดในการลบบทเรียน: " + errMsg(error))
      return false
    }
  }, [lesson, confirm, onChanged])

  const isTutor = course?.kind === "tutor"

  const isTabEnabled = useCallback(
    (t: LessonTab) => {
      if (!lesson) return false
      if (t === "video") return true
      if (t === "docs") return !!lesson.has_docs
      if (t === "test") return !isTutor && !!(lesson.has_pretest || lesson.has_posttest)
      return !isTutor && !!lesson.has_assignment
    },
    [lesson, isTutor],
  )

  return {
    lesson,
    course,
    data,
    loading,
    isTutor,
    saveState,
    markDirty,
    reload,
    patchLesson,
    saveDetails,
    createLesson,
    deleteLesson,
    isTabEnabled,
  }
}
