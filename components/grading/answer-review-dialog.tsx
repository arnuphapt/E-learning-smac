"use client"

import { CheckIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { ToneBadge } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/states"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { QuestionRow, StudentFallback, TestKind, TestScoreRow } from "./scores"

interface ChoiceItem {
  id: string
  text?: string
}

/** One student's pre/post answers against the answer key. Mount only while open. */
export function AnswerReviewDialog({
  student,
  record,
  kind,
  questions,
  lessonIndex,
  onClose,
}: {
  student: StudentFallback
  record: TestScoreRow
  kind: TestKind
  questions: QuestionRow[]
  lessonIndex: number | null
  onClose: () => void
}) {
  const rawAnswers = kind === "pre" ? record.pre_answers : record.post_answers
  const studentAnswers = (rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers) ? rawAnswers : null) as Record<string, string | undefined> | null
  const filteredQs = questions.filter((q) => q.kind === kind)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>รายละเอียดคำตอบ: {student.name}</DialogTitle>
          <DialogDescription>
            แบบทดสอบ{kind === "pre" ? "ก่อนเรียน (Pre-test)" : "หลังเรียน (Post-test)"} · บทที่ {lessonIndex}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border bg-muted px-4 py-3">
          <div>
            <div className="text-xs text-muted-foreground">รหัสนักศึกษา</div>
            <div className="text-sm font-bold">{student.student_no}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">คะแนนที่ได้</div>
            <div className="text-lg font-extrabold text-primary">
              {kind === "pre" ? record.pre : record.post} / {record.total}
            </div>
          </div>
        </div>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          {!studentAnswers || Object.keys(studentAnswers).length === 0 ? (
            <EmptyState
              icon={<TriangleAlertIcon />}
              title="ไม่พบประวัติการเลือกคำตอบรายข้อ"
              description="นักศึกษาอาจจะทำแบบทดสอบก่อนที่จะมีการอัปเดตระบบบันทบัติ หรือข้อมูลไม่ได้ถูกจัดเก็บแบบละเอียด"
            />
          ) : (
            filteredQs.map((q, idx) => {
              const studentChoiceId = studentAnswers[q.id]
              const isCorrect = studentChoiceId === q.answer
              return (
                <div key={q.id} className="rounded-lg border bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex gap-2 text-sm font-bold">
                      <span>{idx + 1}.</span>
                      <span className="leading-relaxed">{q.text}</span>
                    </div>
                    <ToneBadge tone={isCorrect ? "success" : "danger"}>{isCorrect ? "ถูกต้อง" : "ไม่ถูกต้อง"}</ToneBadge>
                  </div>
                  <div className="grid gap-2 pl-4">
                    {(Array.isArray(q.choices) ? (q.choices as unknown as ChoiceItem[]) : []).map((choice) => {
                      const isSelected = studentChoiceId === choice.id
                      const isAnswerKey = q.answer === choice.id
                      const wrongPick = isSelected && !isCorrect
                      return (
                        <div
                          key={choice.id}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm",
                            isAnswerKey && "border-success bg-success-soft text-success",
                            wrongPick && "border-destructive bg-destructive/10 text-destructive",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", isSelected ? "border-primary bg-primary" : "border-muted-foreground")}
                          >
                            {isSelected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                          </span>
                          <span>{choice.text}</span>
                          {isAnswerKey && (
                            <span className="ml-auto flex items-center gap-1 text-xs font-bold">
                              <CheckIcon className="size-3" /> คำตอบที่ถูกต้อง
                            </span>
                          )}
                          {wrongPick && (
                            <span className="ml-auto flex items-center gap-1 text-xs font-bold">
                              <XIcon className="size-3" /> คำตอบของนักศึกษา
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
