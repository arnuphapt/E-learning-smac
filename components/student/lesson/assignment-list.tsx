import Link from "next/link"
import { ArrowRightIcon, CalendarIcon, ClipboardListIcon, FileTextIcon } from "lucide-react"
import { EmptyState } from "@/components/common/states"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AssignmentRow, SubmissionRow } from "./types"

/** Assignments of a lesson with the student's submission status. `title` adds a card header, `showInstructions` the assignment text. */
export function AssignmentList({
  assignments,
  submissions,
  title,
  showInstructions = false,
}: {
  assignments: AssignmentRow[]
  submissions: SubmissionRow[]
  title?: string
  showInstructions?: boolean
}) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={<FileTextIcon />} title="บทเรียนนี้ไม่มีใบงาน" />
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="gap-0 py-0">
      {title && (
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="size-[18px] text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="divide-y px-0">
        {assignments.map((a) => {
          const status = submissions.find((s) => s.assignment_id === a.id)?.status ?? "not-submitted"
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <ClipboardListIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{a.title}</div>
                  {showInstructions && a.instructions && (
                    <p className="mt-1 max-w-lg text-xs whitespace-pre-line text-muted-foreground text-pretty">{a.instructions}</p>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon className="size-3.5" />
                    กำหนดส่ง {a.due} {a.due_time} · {a.points} คะแนน
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <Button asChild size="sm">
                  <Link href={"/s/assignment/" + a.id}>
                    เปิดใบงาน
                    <ArrowRightIcon />
                  </Link>
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
