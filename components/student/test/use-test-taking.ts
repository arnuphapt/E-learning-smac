"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { STUDENT_LESSON_COLUMNS } from "@/lib/files"
import { loadStudentQuestions } from "@/lib/questions"
import { isStaffRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import { formatDueThai, isPastDue, parseTestConfig, type LessonRow, type StudentQuestionRow, type TestScoreRow } from "@/components/student/lesson/types"

const DEFAULT_LIMIT_SECONDS = 1800

/** Everything the test-taking page needs: lesson + questions, answers/flags/current question, the countdown (survives a refresh) and submit. */
export function useTestTaking(lessonId: string | undefined, kind: string) {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const role = session?.user?.role
  const studentId = session?.user?.id || session?.dbId

  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [qs, setQs] = useState<StudentQuestionRow[]>([])
  const [testScore, setTestScore] = useState<TestScoreRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [cur, setCur] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_LIMIT_SECONDS)
  const answersRef = useRef(answers)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return
    let cancelled = false
    async function load() {
      if (!lessonId) return
      const [lRes, qRes, tsRes] = await Promise.all([
        supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).eq("id", lessonId).single(),
        loadStudentQuestions(supabase, lessonId, kind),
        studentId
          ? supabase.from("test_scores").select("*").eq("student_id", studentId).eq("lesson_id", lessonId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (cancelled) return

      if (lRes.data && lRes.data.status === "draft" && !isStaffRole(role)) {
        setLesson(null)
        setQs([])
        setLoading(false)
        return
      }
      setLesson(lRes.data)
      setQs(qRes.data || [])
      if (tsRes && tsRes.data) setTestScore(tsRes.data)

      // time limit (minutes) from the lesson's test settings; a saved countdown wins so a refresh does not reset it
      const configLimit = parseTestConfig(kind === "pre" ? lRes.data?.pretest : lRes.data?.posttest)?.time_limit ?? 30
      const limitSeconds = parseInt(String(configLimit), 10) * 60
      const saved = sessionStorage.getItem(`test_timer_${lessonId}_${kind}`)
      const remaining = saved ? parseInt(saved, 10) : 0
      setTimeLeft(remaining > 0 ? remaining : limitSeconds)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [lessonId, role, studentId, authStatus, kind])

  async function submit(auto = false) {
    if (!studentId) {
      toast.error("ไม่พบข้อมูลนักศึกษา กรุณาเข้าสู่ระบบใหม่")
      return
    }
    try {
      // graded server-side: the answer key never reaches the browser
      const res = await fetch("/api/tests/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson!.id, kind, answers: auto ? answersRef.current : answers }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || "HTTP " + res.status)
      }
      sessionStorage.removeItem(`test_timer_${lessonId}_${kind}`)
      router.push("/s/test/" + lesson!.id + "/" + kind + "/result")
    } catch (err) {
      console.error("Error saving test score:", err)
      toast.error("เกิดข้อผิดพลาดในการบันทึกคะแนน: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  // countdown: persisted every second, auto-submits at 0
  useEffect(() => {
    if (loading) return
    sessionStorage.setItem(`test_timer_${lessonId}_${kind}`, timeLeft.toString())
    if (timeLeft <= 0) {
      submit(true)
      return
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, loading])

  const isStaff = isStaffRole(role)
  const testConfig = parseTestConfig(kind === "pre" ? lesson?.pretest : lesson?.posttest)
  const existingScore = testScore ? (kind === "pre" ? testScore.pre : testScore.post) : null
  const hasTaken = existingScore !== null && existingScore !== undefined
  const dueTime = testConfig?.due_time || "23:59"

  return {
    lesson,
    qs,
    loading,
    cur,
    setCur,
    answers,
    choose: (qid: string, cid: string) => setAnswers((a) => ({ ...a, [qid]: cid })),
    flagged,
    toggleFlag: (qid: string) => setFlagged((f) => ({ ...f, [qid]: !f[qid] })),
    confirmOpen,
    setConfirmOpen,
    timeLeft,
    submit,
    blockedByAttempts: !isStaff && (testConfig?.attempts ?? "1") === "1" && hasTaken,
    pastDue: !isStaff && isPastDue(testConfig?.due, dueTime),
    dueText: formatDueThai(testConfig?.due, dueTime),
  }
}
