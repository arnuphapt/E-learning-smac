"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { STUDENT_LESSON_COLUMNS } from "@/lib/files"
import { loadStudentQuestions } from "@/lib/questions"
import { supabase } from "@/lib/supabase"
import type { AssignmentRow, LessonRow, SubmissionRow, TestScoreRow } from "./types"

export type CourseSummary = { id: string | null; code: string | null }

/** A lesson for a student: its course, assignments + submissions, sibling lessons, test score, question counts and the locally stored watch progress. */
export function useLesson(lessonId: string | undefined) {
  const { data: session, status: authStatus } = useSession()
  const studentId = session?.dbId
  const role = session?.user?.role

  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [course, setCourse] = useState<CourseSummary | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [allLessons, setAllLessons] = useState<LessonRow[]>([])
  const [testScore, setTestScore] = useState<TestScoreRow | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [watchProgress, setWatchProgress] = useState(0)
  const [questionCounts, setQuestionCounts] = useState({ pre: 0, post: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return
    let cancelled = false
    async function load() {
      if (!lessonId) return
      const { data: lData } = await supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).eq("id", lessonId).single()
      if (cancelled) return
      if (!lData) {
        setLoading(false)
        return
      }
      if (lData.status === "draft") {
        setLesson(null)
        setLoading(false)
        return
      }

      const [cRes, aRes, allRes, qRes, tsRes] = await Promise.all([
        lData.course_id ? supabase.from("courses").select("*").eq("id", lData.course_id).single() : Promise.resolve({ data: null }),
        supabase.from("assignments").select("*").eq("lesson_id", lessonId),
        lData.course_id
          ? supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).eq("course_id", lData.course_id).order("index", { ascending: true })
          : Promise.resolve({ data: null }),
        loadStudentQuestions(supabase, lessonId),
        studentId
          ? supabase.from("test_scores").select("*").eq("student_id", studentId).eq("lesson_id", lessonId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (cancelled) return

      setLesson(lData)
      setCourse(cRes.data || { id: "c1", code: "Unknown" })

      const fetchedAssignments = aRes.data || []
      setAssignments(fetchedAssignments)
      setAllLessons((allRes.data || []).filter((l) => l.status !== "draft"))

      const qsList = qRes.data || []
      setQuestionCounts({ pre: qsList.filter((q) => q.kind === "pre").length, post: qsList.filter((q) => q.kind === "post").length })
      if (tsRes && tsRes.data) setTestScore(tsRes.data)

      const saved = studentId ? localStorage.getItem(`watch_progress_${studentId}_${lessonId}`) : null
      setWatchProgress(saved ? parseInt(saved, 10) : 0)

      if (studentId && fetchedAssignments.length > 0) {
        const { data: subData } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", studentId)
          .in("assignment_id", fetchedAssignments.map((a) => a.id))
        if (cancelled) return
        setSubmissions(subData || [])
      } else {
        setSubmissions([])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [lessonId, studentId, role, authStatus])

  /** Raise (never lower) the watch progress and remember it in this browser. */
  const updateProgress = useCallback(
    (pct: number) => {
      setWatchProgress((prev) => {
        if (pct <= prev) return prev
        if (studentId) localStorage.setItem(`watch_progress_${studentId}_${lessonId}`, pct.toString())
        return pct
      })
    },
    [studentId, lessonId],
  )

  return { lesson, course, assignments, allLessons, testScore, submissions, questionCounts, watchProgress, updateProgress, studentId, loading }
}
