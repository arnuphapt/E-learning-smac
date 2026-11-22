"use client"

import Link from "next/link"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import type { CourseLessonSummary, EnrichedCourse } from "./types"

/** Expanded row of the course table: the course's lessons with manage / delete / add. */
export function CourseLessonList({
  course,
  onCreateLesson,
  onDeleteLesson,
}: {
  course: EnrichedCourse
  onCreateLesson: (courseId: string | null, lessonsCount: number) => void
  onDeleteLesson: (lesson: CourseLessonSummary) => void
}) {
  return (
    <div className="grid gap-2 px-2 py-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">บทเรียนในรายวิชานี้ ({course.lessonsCount} บทเรียน)</span>
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => onCreateLesson(course.id, course.lessonsCount)}>
          <PlusIcon />
          เพิ่มบทเรียนใหม่
        </Button>
      </div>
      {course.lessons.length > 0 ? (
        <div className="grid gap-2">
          {course.lessons.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary-soft-foreground">
                  {String(l.index).padStart(2, "0")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{l.title || "(ไม่มีชื่อบทเรียน)"}</div>
                  <div className="mt-0.5">
                    <ToneBadge tone={l.status === "active" ? "success" : "muted"}>{l.status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</ToneBadge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={"/i/lesson/" + l.id}>
                    <PencilIcon />
                    จัดการ
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`ลบบทเรียน ${l.title}`} onClick={() => onDeleteLesson(l)}>
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-3 text-center text-xs text-muted-foreground">ยังไม่มีบทเรียนในรายวิชานี้</div>
      )}
    </div>
  )
}
