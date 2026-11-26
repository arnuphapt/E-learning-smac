import type { Database, Json } from "@/lib/database.types"
import { sectionRangeMatch } from "@/lib/course-access"
import type { CourseRow } from "./types"
import type { SectionRow } from "./draft"

export type { CourseRow, SectionRow }
export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"]
export type StudentRow = Database["public"]["Tables"]["users"]["Row"]
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]
export type TestScoreRow = Database["public"]["Tables"]["test_scores"]["Row"]

export interface CourseAssignmentRef {
  id: string
  lesson_id: string | null
  title?: string | null
  points?: number | null
}

export interface InstructorOption {
  id: string
  name: string
  email: string | null
  role: string | null
  group_id: string | null
}

export interface GradeRow {
  prefix: string
  year_label: string
}

interface CourseAccessJson {
  allowedEmails?: string[]
  sectionRanges?: unknown
  [key: string]: unknown
}

export function parseCourseAccess(raw: Json | null | undefined): CourseAccessJson {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return raw as CourseAccessJson
}

/** Section name of a student: by the last 3 digits of the student number against master ranges, else the profile section. */
export function getStudentSectionName(studentNo: string | null | undefined, defaultSection: string | null | undefined, sectionsList: SectionRow[]) {
  if (!studentNo || !sectionsList || sectionsList.length === 0) return defaultSection || "-"
  const snoStr = String(studentNo).trim()
  if (snoStr.length < 3) return defaultSection || "-"
  const last3 = parseInt(snoStr.slice(-3), 10)
  if (isNaN(last3)) return defaultSection || "-"

  for (const s of sectionsList) {
    if (s.range_start && s.range_end) {
      const start = parseInt(s.range_start, 10)
      const end = parseInt(s.range_end, 10)
      if (!isNaN(start) && !isNaN(end) && last3 >= start && last3 <= end) return s.name
    }
  }
  return defaultSection || "-"
}

/** Students who can see the course: manual allow-list, or matching section and year level. */
export function getEnrolledStudents(course: CourseRow, students: StudentRow[], sectionsList: SectionRow[], gradesList: GradeRow[]) {
  const courseSection = course.section
  const allowedYears = (course.year_level || []) as Array<number | string>
  const allowedEmails = parseCourseAccess(course.access).allowedEmails || []
  return students.filter((s) => {
    if (s.email && allowedEmails.includes(s.email)) return true
    if (courseSection && courseSection !== "ไม่ระบุ Section") {
      const rangeMatch = sectionRangeMatch(s.student_no, courseSection, sectionsList)
      if (rangeMatch === false) return false
      // no master range: fall back to the profile section
      if (rangeMatch !== true && s.section !== courseSection) return false
    }
    if (allowedYears.length > 0) {
      const prefix = s.student_no ? s.student_no.substring(0, 2) : ""
      const mapping = gradesList.find((g) => g.prefix === prefix)
      const studentLabel = mapping ? mapping.year_label : null
      const studentFallback = s.study_year ? Number(s.study_year) : null

      const hasMatch = allowedYears.some((ay) => {
        if (typeof ay === "number" || !isNaN(Number(ay))) {
          return Number(ay) === studentFallback || ay == studentFallback
        }
        return ay === studentLabel
      })
      if (!hasMatch) return false
    }
    return true
  })
}

/** Year level labels ("ชั้นปีที่ 2") or numbers → numbers, as stored in `courses.year_level`. */
export const toYearNumbers = (levels: Array<string | number>) =>
  levels
    .map((y) => {
      const parsed = parseInt(String(y).replace(/\D/g, ""), 10)
      return isNaN(parsed) ? null : parsed
    })
    .filter((y): y is number => Boolean(y))
