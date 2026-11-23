import { CheckIcon, LockIcon, XIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { parseChoices, type QuestionChoiceItem } from "@/components/student/lesson/types"
import type { QuestionWithAnswer } from "./use-test-result"

/** Answer key per question: the first `correct` questions are shown as answered right, the rest as answered wrong. */
export function AnswerReview({ questions, correct, showAnswers }: { questions: QuestionWithAnswer[]; correct: number; showAnswers: boolean }) {
  if (!showAnswers) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2.5 py-3 text-center">
          <div className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <LockIcon className="size-[18px]" />
          </div>
          <div>
            <div className="font-semibold">ผู้สอนปิดการแสดงเฉลยคำตอบ</div>
            <div className="mt-1 text-xs text-muted-foreground">คะแนนสอบของคุณถูกบันทึกเข้าระบบเรียบร้อยแล้ว แต่การแสดงเฉลยข้อสอบถูกระงับไว้โดยผู้สอน</div>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {questions.map((q, i) => {
        const isCorrect = i < correct
        const choices = parseChoices(q.choices)
        const chosen = isCorrect ? q.answer : (choices.find((c) => c.id !== q.answer) || ({} as Partial<QuestionChoiceItem>)).id
        return (
          <Card key={q.id}>
            <CardContent className="flex items-start gap-3">
              <div className={cn("grid size-[26px] shrink-0 place-items-center rounded-lg", isCorrect ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive")}>
                {isCorrect ? <CheckIcon className="size-[15px]" aria-label="ถูก" /> : <XIcon className="size-[15px]" aria-label="ผิด" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-pretty">{q.no}. {q.text}</div>
                <div className="mt-2 flex flex-col gap-1">
                  {choices.map((ch) => {
                    const right = ch.id === q.answer
                    const picked = ch.id === chosen
                    const wrongPick = picked && !right
                    return (
                      <div
                        key={ch.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                          right ? "bg-success-soft font-semibold text-success" : wrongPick ? "bg-destructive/10 font-semibold text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {right ? <CheckIcon className="size-3.5" /> : wrongPick ? <XIcon className="size-3.5" /> : <span className="w-3.5" />}
                        {ch.text}
                        {picked && <span className="text-xs opacity-70">· คำตอบของคุณ</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
