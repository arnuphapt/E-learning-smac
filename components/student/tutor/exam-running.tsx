import type { Json } from "@/lib/database.types"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { QuestionCard } from "@/components/student/test/question-card"
import { ExamAlert } from "./exam-alert"
import { ExamPalette } from "./exam-palette"
import type { ExamState } from "./exam-types"

/** A running round: save / time-up notices, progress, the current question, prev / next and the navigator. */
export function ExamRunning({
  exam,
  timeUp,
  saveError,
  submitError,
  submitting,
  onChoose,
  onGo,
  onRetrySubmit,
}: {
  exam: ExamState
  timeUp: boolean
  saveError: string
  submitError: boolean
  submitting: boolean
  onChoose: (questionId: string, choiceId: string) => void
  onGo: (index: number) => void
  onRetrySubmit: () => void
}) {
  const { questions, answers, cur, attempt } = exam
  const q = questions[cur]
  const answered = questions.filter((x) => answers[x.id] != null).length

  return (
    <>
      {saveError && <ExamAlert tone="danger" className="mb-3">{saveError}</ExamAlert>}
      {!timeUp && submitError && <ExamAlert tone="danger" className="mb-3">ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่</ExamAlert>}
      {timeUp && (
        <ExamAlert
          tone="danger"
          className="mb-3"
          action={submitError && <Button variant="secondary" size="sm" disabled={submitting} onClick={onRetrySubmit}>ส่งอีกครั้ง</Button>}
        >
          {submitError ? "หมดเวลาแล้ว แต่ส่งคำตอบไม่สำเร็จ กรุณาลองส่งอีกครั้ง" : "หมดเวลาแล้ว กำลังส่งคำตอบ..."}
        </ExamAlert>
      )}

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="w-full min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">ข้อ <b className="text-foreground">{cur + 1}</b> จาก {questions.length}</div>
            <div className="text-xs text-muted-foreground">ตอบแล้ว {answered}/{questions.length}</div>
          </div>
          <Progress className="mb-4 h-1.5" value={((cur + 1) / questions.length) * 100} aria-label="ความคืบหน้าของข้อสอบ" />

          <QuestionCard
            question={{ id: q.id, no: cur + 1, type: q.type, text: q.text, choices: q.choices as Json, lesson_id: null, kind: null }}
            answer={answers[q.id] ?? undefined}
            disabled={timeUp}
            onChoose={(cid) => onChoose(q.id, cid)}
          />

          <div className="mt-4 flex items-center justify-between">
            <Button variant="secondary" disabled={cur === 0} onClick={() => onGo(cur - 1)}>
              <ArrowLeftIcon />
              ก่อนหน้า
            </Button>
            <Button disabled={cur >= questions.length - 1} onClick={() => onGo(cur + 1)}>
              ข้อถัดไป
              <ArrowRightIcon />
            </Button>
          </div>
        </div>

        <ExamPalette questions={questions} answers={answers} current={cur} minutes={attempt.minutes} onJump={onGo} />
      </div>
    </>
  )
}
