import type { Database } from "@/lib/database.types"

type CourseRow = Database["public"]["Views"]["courses"]["Row"]

export interface MappedCourse extends Omit<CourseRow, "lessons" | "progress"> {
  lessons: number
  progress: number
}

export const startLabel = (progress: number) => (progress >= 100 ? "ทบทวน" : progress > 0 ? "เรียนต่อ" : "เริ่มเรียน")
