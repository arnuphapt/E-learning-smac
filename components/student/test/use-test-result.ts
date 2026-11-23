"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { STUDENT_LESSON_COLUMNS } from "@/lib/files"
import { loadStudentQuestions } from "@/lib/questions"
import { isStaffRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import type { LessonRow, StudentQuestionRow, TestScoreRow } from "@/components/student/lesson/types"

export type QuestionWithAnswer = StudentQuestionRow & { answer?: string }

/** Lesson, questions (with the answer key from the server when allowed) and the student's score for a finished test. */
export function useTestResult(lessonId: string | undefined, kind: string) {
  const { data: session, status: authStatus } = useSession()
  const studentId = session?.user?.id || session?.dbId
  const role = session?.user?.role

  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([])
  const [testScore, setTestScore] = useState<TestScoreRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return
    let cancelled = false
    async function load() {
      if (!lessonId) return
      const [lRes, qRes] = await Promise.all([
        supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).eq("id", lessonId).single(),
        loadStudentQuestions(supabase, lessonId, kind),
      ])
      if (cancelled) return
      if (lRes.data && lRes.data.status === "draft" && !isStaffRole(role)) {
        setLesson(null)
        setQuestions([])
        setLoading(false)
        return
      }

      if (lRes.data) setLesson(lRes.data)
      if (qRes.data) {
        // answer key comes from the server, only for this student's completed attempt (and if the lesson shows answers)
        let key: Record<string, string> | null = null
        try {
          const r = await fetch(`/api/tests/result?lessonId=${encodeURIComponent(lessonId)}&kind=${kind}`, { cache: "no-store" })
          if (r.ok) key = ((await r.json()) as { answers?: Record<string, string> }).answers ?? null
        } catch {}
        if (cancelled) return
        setQuestions(key ? qRes.data.map((q) => ({ ...q, answer: q.id ? key[q.id] : undefined })) : qRes.data)
      }

      if (studentId) {
        const { data: tsRes } = await supabase.from("test_scores").select("*").eq("student_id", studentId).eq("lesson_id", lessonId).maybeSingle()
        if (cancelled) return
        if (tsRes) setTestScore(tsRes)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [lessonId, studentId, role, authStatus, kind])

  return { lesson, questions, testScore, loading }
}
