import * as XLSX from "xlsx"
import { sectionRangeMatch } from "@/lib/course-access"
import type { Database, Json } from "@/lib/database.types"

export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"]
export type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"]
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]
export type TestScoreRow = Database["public"]["Tables"]["test_scores"]["Row"]
export type StudentRow = Database["public"]["Tables"]["users"]["Row"]
export type SectionRow = Database["public"]["Tables"]["sections"]["Row"]
export type CourseAllRow = Database["public"]["Tables"]["courses_all"]["Row"]

export interface GradeRow {
  prefix: string
  year_label: string
}

export interface ScoresBundleData {
  questions: QuestionRow[]
  assignments: AssignmentRow[]
  submissions: SubmissionRow[]
  testScores: TestScoreRow[]
  students: StudentRow[]
  studentGrades: GradeRow[]
  sectionsList: SectionRow[]
}

export interface StudentFallback {
  id?: string
  name: string
  student_no: string | null
  section?: string | null
}

export type TestKind = "pre" | "post"

function parseCourseAccess(raw: Json | null | undefined): { allowedEmails?: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return raw as { allowedEmails?: string[] }
}

/** Students the course lets in: allow-listed email, or section + year-level rules. */
export function filterEnrolledStudents(data: ScoresBundleData, course: Partial<CourseAllRow>): StudentRow[] {
  const courseSection = course.section
  const allowedYears = (course.year_level || []) as Array<number | string>
  const allowedEmails = parseCourseAccess(course.access).allowedEmails || []
  const gradesList = data.studentGrades || []
  const sectionsList = data.sectionsList || []

  return data.students.filter((s) => {
    if (s.email && allowedEmails.includes(s.email)) return true
    if (courseSection && courseSection !== "ไม่ระบุ Section") {
      const rangeMatch = sectionRangeMatch(s.student_no, courseSection, sectionsList)
      if (rangeMatch === null) {
        if (s.section !== courseSection) return false
      } else if (!rangeMatch) {
        return false
      }
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

/** Average of the non-null values, one decimal, or an em dash. */
export function average(values: Array<number | null | undefined>): string {
  const vals = values.filter((v): v is number => v !== null && v !== undefined)
  return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—"
}

/** Downloads the score sheet (one row per enrolled student, one column per assignment). */
export function exportScoresExcel(opts: {
  enrolledStudents: StudentRow[]
  enrolledScores: TestScoreRow[]
  data: ScoresBundleData
  courseCode: string | null | undefined
  lessonIndex: number | null
}) {
  const { enrolledStudents, enrolledScores, data, courseCode, lessonIndex } = opts
  const exportData = enrolledStudents.map((s) => {
    const ts: Partial<TestScoreRow> = enrolledScores.find((t) => t.student_id === s.id) || {}
    const subList = data.submissions.filter((sub) => sub.student_id === s.id)

    const row: Record<string, string | number> = {
      "รหัสนักศึกษา": s.student_no || "-",
      "ชื่อ-นามสกุล": s.name || "-",
      "อีเมล": s.email || "-",
      "Section": s.section || "-",
      "Pre-test Score": ts.pre !== undefined && ts.pre !== null ? `${ts.pre}/${ts.total || 0}` : "ยังไม่ทำ",
      "Post-test Score": ts.post !== undefined && ts.post !== null ? `${ts.post}/${ts.total || 0}` : "ยังไม่ทำ",
      "พัฒนาการ": ts.post != null && ts.pre != null ? ts.post - ts.pre : "—",
    }

    data.assignments.forEach((asg) => {
      const sub = subList.find((x) => x.assignment_id === asg.id)
      row[`ใบงาน: ${asg.title}`] = sub ? (sub.score !== null ? `${sub.score}/${sub.total}` : "ยังไม่ได้ตรวจ") : "ยังไม่ส่ง"
    })

    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "คะแนนนักศึกษา")
  XLSX.writeFile(workbook, `คะแนน_${courseCode}_บทที่_${lessonIndex}.xlsx`)
}
