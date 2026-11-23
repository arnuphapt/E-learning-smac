"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import type { Database, Json } from "@/lib/database.types"
import { STUDENT_LESSON_COLUMNS } from "@/lib/files"
import { supabase } from "@/lib/supabase"

type CourseRow = Database["public"]["Views"]["courses"]["Row"]

export interface LessonTestStatus {
  required?: boolean
  taken?: boolean
  score?: number | null
  total?: number | null
  [key: string]: unknown
}

export interface CourseLessonItem {
  id: string
  index: number | null
  title: string
  duration: string | null
  status: string | null
  progress: number | null
  video: boolean | null
  video_url: string | null
  pretest: LessonTestStatus | Json | null
  posttest: LessonTestStatus | Json | null
  assignments?: Array<{ id: string; status: string | null }>
}

export function asTestObj(raw: LessonTestStatus | Json | null): LessonTestStatus | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  return raw as LessonTestStatus
}

/** A course with its visible lessons, plus the student's test scores, assignment status and local watch progress per lesson. */
export function useCourseDetail(courseId: string | undefined) {
  const { data: session, status: authStatus } = useSession()
  const studentId = session?.dbId
  const role = session?.user?.role
  const [course, setCourse] = useState<CourseRow | null>(null)
  const [lessons, setLessons] = useState<CourseLessonItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return
    let cancelled = false
    async function load() {
      if (!courseId) return
      const [cRes, lRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).eq("course_id", courseId).order("index", { ascending: true }),
      ])
      if (cancelled) return
      if (!cRes.data) {
        setLoading(false)
        return
      }

      let fetchedLessons: CourseLessonItem[] = (lRes.data || []).filter((l) => l.status !== "draft")

      if (studentId) {
        const [tsRes, subRes, assignRes] = await Promise.all([
          supabase.from("test_scores").select("*").eq("student_id", studentId),
          supabase.from("submissions").select("*").eq("student_id", studentId),
          supabase.from("assignments").select("*").eq("course_id", courseId),
        ])
        if (cancelled) return
        const testScores = tsRes.data || []
        const submissions = subRes.data || []
        const assignments = assignRes.data || []

        fetchedLessons = fetchedLessons.map((l) => {
          const myScore = testScores.find((ts) => ts.student_id === studentId && ts.lesson_id === l.id)
          const preTaken = myScore ? myScore.pre !== null && myScore.pre !== undefined : false
          const postTaken = myScore ? myScore.post !== null && myScore.post !== undefined : false
          const preObj = asTestObj(l.pretest)
          const postObj = asTestObj(l.posttest)

          let status = l.status || "active"
          if (preObj?.required && !preTaken && (l.index ?? 0) > 1) status = "locked-pretest"

          const mappedAssignments = assignments
            .filter((a) => a.lesson_id === l.id)
            .map((asg) => ({ id: asg.id, status: submissions.find((s) => s.assignment_id === asg.id)?.status ?? "todo" }))

          const saved = localStorage.getItem(`watch_progress_${studentId}_${l.id}`)
          const progress = saved ? parseInt(saved, 10) : 0

          return {
            ...l,
            status,
            progress,
            pretest: preObj ? { ...preObj, taken: preTaken, score: myScore ? myScore.pre : null, total: myScore ? myScore.total : null } : null,
            posttest: postObj ? { ...postObj, taken: postTaken, score: myScore ? myScore.post : null, total: myScore ? myScore.total : null } : null,
            assignments: mappedAssignments,
          }
        })
      }

      setCourse(cRes.data)
      setLessons(fetchedLessons)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [courseId, studentId, role, authStatus])

  return { course, lessons, loading }
}
