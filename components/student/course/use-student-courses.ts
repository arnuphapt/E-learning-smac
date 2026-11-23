"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { DEFAULT_DOMAIN, sectionRangeMatch } from "@/lib/course-access"
import type { Database } from "@/lib/database.types"
import { isStaffRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import { matchesYearLevel } from "@/lib/year-level"
import type { MappedCourse } from "./types"

type AcademicYearRow = Database["public"]["Tables"]["academic_years"]["Row"]

/** Courses the signed-in user may open (staff: all; students: by allowed email, section range and year level), with lesson count and local watch progress. */
export function useStudentCourses() {
  const { data: session, status: authStatus } = useSession()
  const studentId = session?.dbId
  const role = session?.user?.role
  const [courses, setCourses] = useState<MappedCourse[]>([])
  const [years, setYears] = useState<AcademicYearRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for the session: role/year decide the filter, and a run started while it is still loading applies the
    // student filter and can finish after the real run (intermittent "only 1 course" for staff).
    if (authStatus !== "authenticated") return
    let cancelled = false
    const studentYear = session?.user?.study_year ? Number(session.user.study_year) : null
    const email = session?.user?.email || ""

    async function loadData() {
      const [cRes, yRes, lRes, sgRes, uRes, secRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("academic_years").select("*").order("year", { ascending: false }),
        supabase.from("lessons").select("id, course_id, status"),
        supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
        studentId ? supabase.from("users").select("*").eq("id", studentId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("sections").select("*"),
      ])
      if (cancelled) return
      const studentProfile = uRes?.data
      const sectionsList = secRes?.data || []

      if (cRes.data) {
        const visibleLessons = lRes.data ? lRes.data.filter((l) => l.status !== "draft") : []
        const mappedCourses: MappedCourse[] = cRes.data.map((c) => {
          const courseLessons = visibleLessons.filter((l) => l.course_id === c.id)
          const lessonsCount = courseLessons.length
          let progress = 0
          if (studentId && lessonsCount > 0) {
            const total = courseLessons.reduce((acc, l) => {
              const saved = localStorage.getItem(`watch_progress_${studentId}_${l.id}`)
              return acc + (saved ? parseInt(saved, 10) : 0)
            }, 0)
            progress = Math.round(total / lessonsCount)
          }
          return { ...c, lessons: lessonsCount, progress }
        })

        const gradesList = sgRes.data || []
        const match = email.match(/^(\d+)@/)
        const finalStudentNo = studentProfile?.student_no || (match ? match[1] : "")
        const finalStudentSec = studentProfile?.section || ""
        const prefix = match ? match[1].substring(0, 2) : ""
        const studentLabel = gradesList.find((g) => g.prefix === prefix)?.year_label ?? null

        // Filter by year_level & master sectionRanges access control (staff sees all)
        const filtered = isStaffRole(role)
          ? mappedCourses
          : mappedCourses.filter((c) => {
              const accessObj = (c.access && typeof c.access === "object" && !Array.isArray(c.access) ? c.access : null) as { allowedEmails?: string[] } | null
              if ((accessObj?.allowedEmails || []).includes(email)) return true

              // Check section ranges or fallback to profile section comparison
              if (c.section && c.section !== "ไม่ระบุ Section") {
                const rangeMatch = sectionRangeMatch(finalStudentNo, c.section, sectionsList)
                if (rangeMatch === null) {
                  if (finalStudentSec !== c.section) return false // static fallback check
                } else if (!rangeMatch) {
                  return false
                }
              }

              return matchesYearLevel(c.year_level, studentYear, studentLabel)
            })
        setCourses(filtered)
      }
      if (yRes.data) setYears(yRes.data)
      setLoading(false)
    }
    loadData()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, role, authStatus])

  return { courses, years, loading }
}
