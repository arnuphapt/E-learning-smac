import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ExamQuestion } from "./exam-types"

/** Navigator of the round: the numbers are the locked order of this round; answered / current state, jump on click. */
export function ExamPalette({
  questions,
  answers,
  current,
  minutes,
  onJump,
}: {
  questions: ExamQuestion[]
  answers: Record<string, string | null>
  current: number
  minutes: number
  onJump: (index: number) => void
}) {
  return (
    <Card className="w-full lg:sticky lg:top-20 lg:w-60 lg:shrink-0">
      <CardContent>
        <h2 className="mb-1 text-sm font-bold">รายการข้อสอบ</h2>
        <p className="mb-3 text-xs text-muted-foreground">{questions.length} ข้อ · {minutes} นาที</p>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => (
            <Button
              key={q.id}
              type="button"
              variant={answers[q.id] != null ? "default" : "outline"}
              aria-label={`ข้อ ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
              className={cn("aspect-square h-auto p-0 font-bold", i === current && "border-primary ring-2 ring-primary/40")}
              onClick={() => onJump(i)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
        <Separator className="mt-4 mb-3" />
        <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2"><span className="size-3.5 rounded bg-primary" />ตอบแล้ว</li>
          <li className="flex items-center gap-2"><span className="size-3.5 rounded border-[1.5px]" />ยังไม่ตอบ</li>
        </ul>
      </CardContent>
    </Card>
  )
}
