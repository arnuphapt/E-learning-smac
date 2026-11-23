"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { isStaffRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import { DEFAULT_DOMAIN, sectionRangeMatch } from "@/lib/course-access"
import { STUDENT_LESSON_COLUMNS } from "@/lib/files"
import { matchesYearLevel } from "@/lib/year-level"
import type { CourseRow, StudentLessonRow } from "./types"

/** Courses the student may open (same access rules as the course list) + their non-draft lessons, and the course/lesson selection. */
export function useAiCourses() {
  const { data: session, status: authStatus } = useSession()
  const studentId = session?.dbId || session?.user?.id
  const role = session?.user?.role
  const studentYear = session?.user?.study_year ? Number(session.user.study_year) : null

  const [courses, setCourses] = useState<CourseRow[]>([])
  const [allLessons, setAllLessons] = useState<StudentLessonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedLessonId, setSelectedLessonId] = useState("")

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return
    let cancelled = false
    async function loadData() {
      const [cRes, lRes, sgRes, uRes, secRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).order("index", { ascending: true }),
        supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
        studentId ? supabase.from("users").select("*").eq("id", studentId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("sections").select("*"),
      ])

      if (cancelled) return
      const cData = cRes.data
      const lData = lRes.data
      const studentProfile = uRes?.data
      const sectionsList = secRes?.data || []

      if (cData) {
        const isStaff = isStaffRole(role)
        const visibleLessons: StudentLessonRow[] = lData ? lData.filter((l) => l.status !== "draft") : []
        setAllLessons(visibleLessons)

        const gradesList = sgRes.data || []
        const email = session?.user?.email || ""
        const match = email.match(/^(\d+)@/)
        const parsedStudentNo = match ? match[1] : ""
        const finalStudentNo = studentProfile?.student_no || parsedStudentNo
        const finalStudentSec = studentProfile?.section || ""

        const prefix = match ? match[1].substring(0, 2) : ""
        const mapping = gradesList.find((g) => g.prefix === prefix)
        const studentLabel = mapping ? mapping.year_label : null
        const studentFallback = studentYear

        // Filter courses student has access to
        const filteredCourses = isStaff
          ? cData
          : cData.filter((c) => {
              const rawEmails =
                c.access && typeof c.access === "object" && !Array.isArray(c.access)
                  ? (c.access as { allowedEmails?: unknown }).allowedEmails
                  : null
              const allowedEmails = Array.isArray(rawEmails) ? rawEmails : []
              if (allowedEmails.includes(email)) return true

              if (c.section && c.section !== "ไม่ระบุ Section") {
                const rangeMatch = sectionRangeMatch(finalStudentNo, c.section, sectionsList)
                if (rangeMatch === null) {
                  if (finalStudentSec !== c.section) return false
                } else if (!rangeMatch) {
                  return false
                }
              }

              return matchesYearLevel(c.year_level, studentFallback, studentLabel)
            })

        setCourses(filteredCourses)

        // Auto select course and lesson based on query param if present
        let matched = false
        const queryLessonId = new URLSearchParams(window.location.search).get("lessonId")
        if (queryLessonId) {
          const foundLesson = visibleLessons.find((l) => l.id === queryLessonId)
          if (foundLesson) {
            if (foundLesson.course_id) setSelectedCourseId(foundLesson.course_id)
            setSelectedLessonId(foundLesson.id)
            matched = true
          }
        }

        if (!matched && filteredCourses.length > 0) {
          const firstCourse = filteredCourses[0]
          if (firstCourse.id) {
            setSelectedCourseId(firstCourse.id)
            const firstCourseLessons = visibleLessons.filter((l) => l.course_id === firstCourse.id)
            if (firstCourseLessons.length > 0) setSelectedLessonId(firstCourseLessons[0].id)
          }
        }
      }
      setLoading(false)
    }
    loadData()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the signed-in user or role changes (same as before)
  }, [studentId, role, authStatus])

  const lessonsForSelectedCourse = allLessons.filter((l) => l.course_id === selectedCourseId)
  const selectedCourse = courses.find((c) => c.id === selectedCourseId)
  const selectedLesson = lessonsForSelectedCourse.find((l) => l.id === selectedLessonId)

  const changeCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    const first = allLessons.find((l) => l.course_id === courseId)
    setSelectedLessonId(first ? first.id : "")
  }

  return {
    courses,
    loading,
    lessonsForSelectedCourse,
    selectedCourse,
    selectedLesson,
    selectedCourseId,
    selectedLessonId,
    setSelectedLessonId,
    changeCourse,
  }
}
