import Link from "next/link"
import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LessonNotes } from "./lesson-notes"
import { NextLessonCard } from "./next-lesson-card"
import { ProgressCard } from "./progress-card"
import type { deriveLessonState } from "./lesson-state"
import type { AssignmentRow, LessonRow, SubmissionRow } from "./types"

/** Right column (below the content on small screens): AI tutor shortcut, progress checklist, notes and next lesson. */
export function SideRail({
  lesson,
  state,
  assignments,
  submissions,
  allLessons,
  watchProgress,
  studentId,
}: {
  lesson: LessonRow
  state: ReturnType<typeof deriveLessonState>
  assignments: AssignmentRow[]
  submissions: SubmissionRow[]
  allLessons: LessonRow[]
  watchProgress: number
  studentId: string | undefined
}) {
  const notesKey = `notes_${studentId || "guest"}_${lesson.id}`
  return (
    <div className="flex flex-col gap-4">
      {lesson.allow_ai !== false && (
        <Card className="bg-primary-soft">
          <CardContent>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <SparklesIcon className="size-[17px] text-primary" />
              AI ผู้ช่วยเรียนรู้
            </div>
            <p className="mb-3 text-xs text-muted-foreground">มีข้อสงสัยเกี่ยวกับบทเรียนหรือต้องการสรุปเนื้อหาสำคัญ? ถาม AI ติวเตอร์ได้ทันที!</p>
            <Button asChild size="sm" className="w-full">
              <Link href={`/s/ai?lessonId=${lesson.id}`}>
                <SparklesIcon />
                คุยกับ AI ติวเตอร์
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <ProgressCard lesson={lesson} state={state} assignments={assignments} submissions={submissions} watchProgress={watchProgress} />
      <LessonNotes key={notesKey} storageKey={notesKey} />
      <NextLessonCard lesson={lesson} allLessons={allLessons} />
    </div>
  )
}
