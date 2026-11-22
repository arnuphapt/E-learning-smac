"use client"

import type { Database } from "@/lib/database.types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CourseRow = Database["public"]["Views"]["courses"]["Row"]
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"]

const ALL = "all"

/** Course, lesson and mode filters for the AI log table. */
export function AiLogFilters({
  courses,
  lessons,
  courseId,
  lessonId,
  mode,
  onCourseChange,
  onLessonChange,
  onModeChange,
}: {
  courses: CourseRow[]
  /** Lessons of the selected course (all lessons when no course is selected). */
  lessons: LessonRow[]
  courseId: string
  lessonId: string
  mode: string
  onCourseChange: (id: string) => void
  onLessonChange: (id: string) => void
  onModeChange: (mode: string) => void
}) {
  return (
    <>
      <Select value={courseId} onValueChange={onCourseChange}>
        <SelectTrigger aria-label="กรองตามรายวิชา" className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>รายวิชา: ทั้งหมด</SelectItem>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id ?? ""}>
              {c.code} {c.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={lessonId} onValueChange={onLessonChange}>
        <SelectTrigger aria-label="กรองตามบทเรียน" className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>บทเรียน: ทั้งหมด</SelectItem>
          {lessons.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              บทที่ {l.index}: {l.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mode} onValueChange={onModeChange}>
        <SelectTrigger aria-label="กรองตามโหมด" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>โหมด: ทั้งหมด</SelectItem>
          <SelectItem value="chat">ถามตอบ (Chat)</SelectItem>
          <SelectItem value="summarize">สรุปบทเรียน</SelectItem>
        </SelectContent>
      </Select>
    </>
  )
}
