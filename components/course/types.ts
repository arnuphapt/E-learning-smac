import type { Database } from "@/lib/database.types"

export type CourseRow = Database["public"]["Views"]["courses"]["Row"]

export interface CourseLessonSummary {
  id: string
  course_id: string | null
  title: string
  index: number | null
  status: string | null
}

export interface EnrichedCourse extends Omit<CourseRow, "lessons"> {
  lessons: CourseLessonSummary[]
  lessonsCount: number
  studentCount: number
  pendingGrading: number
}
