import { SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { StudentQuestionRow } from "@/components/student/lesson/types"

/** Question navigator: answered / current / flagged state per question, jump on click, and a submit shortcut. */
export function QuestionPalette({
  questions,
  answers,
  flagged,
  current,
  onJump,
  onSubmit,
}: {
  questions: StudentQuestionRow[]
  answers: Record<string, string>
  flagged: Record<string, boolean>
  current: number
  onJump: (index: number) => void
  onSubmit: () => void
}) {
  return (
    <Card className="w-full lg:sticky lg:top-4 lg:w-[230px] lg:shrink-0">
      <CardContent>
        <h2 className="mb-1 text-sm font-bold">รายการข้อสอบ</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          ตอบแล้ว {Object.keys(answers).length}/{questions.length} ข้อ
        </p>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const id = q.id || ""
            return (
              <Button
                key={q.id}
                type="button"
                variant={answers[id] ? "default" : "outline"}
                aria-label={`ข้อ ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                className={cn("relative aspect-square h-auto p-0 font-bold", i === current && "border-primary ring-2 ring-primary/40")}
                onClick={() => onJump(i)}
              >
                {i + 1}
                {flagged[id] && <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-background bg-warning" />}
              </Button>
            )
          })}
        </div>
        <Separator className="mt-4 mb-3" />
        <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2"><span className="size-3 rounded bg-primary" />ตอบแล้ว</li>
          <li className="flex items-center gap-2"><span className="size-3 rounded border-[1.5px]" />ยังไม่ตอบ</li>
          <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-warning" />ทำเครื่องหมายไว้</li>
        </ul>
        <Button className="mt-4 w-full" onClick={onSubmit}>
          <SendIcon />
          ส่งคำตอบ
        </Button>
      </CardContent>
    </Card>
  )
}
