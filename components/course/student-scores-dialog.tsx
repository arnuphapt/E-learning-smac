"use client"

import { ClipboardCheckIcon, FileTextIcon } from "lucide-react"
import { StatusBadge, ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

  const preDone = lessons.filter((l) => studentTests.some((t) => t.lesson_id === l.id && t.pre != null)).length
  const postDone = lessons.filter((l) => studentTests.some((t) => t.lesson_id === l.id && t.post != null)).length
  const submittedCount = assignments.filter((a) => studentSubs.some((s) => s.assignment_id === a.id)).length
  const initial = (student.name?.trim()?.[0] || "น").toUpperCase()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border/80 bg-card px-6 py-4 pr-14 text-left">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold tracking-tight">{student.name || "นักศึกษา"}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                รหัส {student.student_no || "—"} · Section {sectionName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-3 divide-x divide-border/70 border-b border-border/70 bg-muted/25">
          <div className="px-4 py-3">
            <div className="text-xs text-muted-foreground">Pre-test ทำแล้ว</div>
            <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
              {preDone}
              <span className="text-xs font-normal text-muted-foreground">/{lessons.length}</span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-muted-foreground">Post-test ทำแล้ว</div>
            <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
              {postDone}
              <span className="text-xs font-normal text-muted-foreground">/{lessons.length}</span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-muted-foreground">ใบงานส่งแล้ว</div>
            <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
              {submittedCount}
              <span className="text-xs font-normal text-muted-foreground">/{assignments.length}</span>
            </div>
          </div>
        </div>

        <div className="modal-scroll flex-1 space-y-6 overflow-y-auto bg-card px-6 py-5">
          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ClipboardCheckIcon className="size-4 text-primary" />
                คะแนนแบบทดสอบ (Pre-test / Post-test)
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">{lessons.length} บทเรียน</span>
            </div>
            {lessons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                ยังไม่มีบทเรียนในรายวิชานี้
              </div>
            ) : (
              <ul className="divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
                {lessons.map((l) => {
                  const ts = studentTests.find((t) => t.lesson_id === l.id)
                  const total = ts?.total ?? null
                  const fmt = (v: number | null | undefined) => (v != null ? (total ? `${v}/${total}` : String(v)) : "—")
                  return (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                          {String(l.index).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">{l.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <ToneBadge tone={ts?.pre != null ? "info" : "muted"}>Pre: {fmt(ts?.pre)}</ToneBadge>
                        <ToneBadge tone={ts?.post != null ? "success" : "muted"}>Post: {fmt(ts?.post)}</ToneBadge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileTextIcon className="size-4 text-primary" />
                คะแนนใบงาน
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">{assignments.length} ใบงาน</span>
            </div>
            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                ยังไม่มีใบงานในรายวิชานี้
              </div>
            ) : (
              <ul className="divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
                {assignments.map((a) => {
                  const sub = studentSubs.find((s) => s.assignment_id === a.id)
                  const lesson = lessons.find((l) => l.id === a.lesson_id)
                  const maxPts = sub?.total ?? a.points ?? null
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{a.title || "ใบงาน"}</div>
                        {lesson && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            บทที่ {lesson.index}: {lesson.title}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <StatusBadge status={sub?.status ?? "not-submitted"} />
                        <span className="min-w-14 text-right text-sm font-semibold tabular-nums text-foreground">
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

        <DialogFooter className="shrink-0 flex justify-end border-t border-border/80 bg-muted/35 px-6 py-3.5">
          <Button type="button" variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
