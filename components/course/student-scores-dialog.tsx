"use client"

import { StatusBadge, ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import type { CourseAssignmentRef, LessonRow, StudentRow, SubmissionRow, TestScoreRow } from "./detail"

/** Shows one student's Pre/Post-test scores and assignment scores in the current course. */
export function StudentScoresDialog({
  student,
  sectionName,
  lessons,
  assignments,
  submissions,
  testScores,
  onClose,
}: {
  student: StudentRow
  sectionName: string
  lessons: LessonRow[]
  assignments: CourseAssignmentRef[]
  submissions: SubmissionRow[]
  testScores: TestScoreRow[]
  onClose: () => void
}) {
  const studentTests = testScores.filter((ts) => ts.student_id === student.id)
  const studentSubs = submissions.filter((sub) => sub.student_id === student.id)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4 pr-12">
          <DialogTitle>{student.name || "นักศึกษา"}</DialogTitle>
          <DialogDescription>
            รหัส {student.student_no || "—"} · Section {sectionName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <section className="grid gap-2.5">
            <h3 className="text-sm font-semibold">คะแนนแบบทดสอบ (Pre-test / Post-test)</h3>
            {lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground">ยังไม่มีบทเรียนในรายวิชานี้</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {lessons.map((l) => {
                  const ts = studentTests.find((t) => t.lesson_id === l.id)
                  const total = ts?.total ?? null
                  const fmt = (v: number | null | undefined) => (v != null ? (total ? `${v}/${total}` : String(v)) : "—")
                  return (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                      <span className="text-sm font-medium">
                        บทที่ {l.index}: {l.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <ToneBadge tone={ts?.pre != null ? "muted" : "muted"}>Pre: {fmt(ts?.pre)}</ToneBadge>
                        <ToneBadge tone={ts?.post != null ? "success" : "muted"}>Post: {fmt(ts?.post)}</ToneBadge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <Separator />

          <section className="grid gap-2.5">
            <h3 className="text-sm font-semibold">คะแนนใบงาน</h3>
            {assignments.length === 0 ? (
              <p className="text-xs text-muted-foreground">ยังไม่มีใบงานในรายวิชานี้</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {assignments.map((a) => {
                  const sub = studentSubs.find((s) => s.assignment_id === a.id)
                  const lesson = lessons.find((l) => l.id === a.lesson_id)
                  const maxPts = sub?.total ?? a.points ?? null
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.title || "ใบงาน"}</div>
                        {lesson && (
                          <div className="text-xs text-muted-foreground">
                            บทที่ {lesson.index}: {lesson.title}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sub?.status ?? "not-submitted"} />
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {sub?.score != null ? `${sub.score}${maxPts != null ? `/${maxPts}` : ""}` : "—"}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-3.5">
          <Button type="button" variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
