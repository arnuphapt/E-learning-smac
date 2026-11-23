import { BookOpenIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { AssignmentList } from "./assignment-list"
import { DocList } from "./doc-list"
import { parseDocs, type AssignmentRow, type LessonRow, type SubmissionRow } from "./types"

/** Lesson without a video: its documents and assignments take the video's place. */
export function NoVideoStage({ lesson, assignments, submissions }: { lesson: LessonRow; assignments: AssignmentRow[]; submissions: SubmissionRow[] }) {
  const hasDocs = parseDocs(lesson.documents).length > 0
  const hasAssigns = assignments.length > 0

  if (!hasDocs && !hasAssigns) {
    return (
      <Card className="bg-muted text-center">
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
            <BookOpenIcon className="size-6" />
          </div>
          <h2 className="text-lg font-bold">ไม่มีสื่อการเรียนการสอนแนบเพิ่มเติม</h2>
          <p className="text-sm text-muted-foreground">บทเรียนนี้ไม่มีวิดีโอ เอกสารแนบ หรือใบงานเพิ่มในบทเรียน</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {hasDocs && <DocList lesson={lesson} title="เอกสารประกอบการเรียน" />}
      {hasAssigns && <AssignmentList assignments={assignments} submissions={submissions} title="ใบงานสำหรับบทเรียนนี้" showInstructions />}
    </div>
  )
}
