import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { parseChoices, type StudentQuestionRow } from "@/components/student/lesson/types"

/** One question with its choices as a radio group. */
export function QuestionCard({ question, answer, onChoose, disabled }: { question: StudentQuestionRow; answer: string | undefined; onChoose: (choiceId: string) => void; disabled?: boolean }) {
  const qid = question.id || ""
  return (
    <Card>
      <CardContent className="md:px-7 md:py-2">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">{question.no}</div>
          <p className="pt-1 text-lg leading-relaxed font-semibold text-pretty">{question.text}</p>
        </div>
        <RadioGroup value={answer ?? ""} onValueChange={onChoose} disabled={disabled} className="gap-2 md:pl-12" aria-label={`ข้อ ${question.no}`}>
          {parseChoices(question.choices).map((ch) => (
            <Label
              key={ch.id}
              htmlFor={`q-${qid}-${ch.id}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-base font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-soft has-data-[state=checked]:font-semibold"
            >
              <RadioGroupItem id={`q-${qid}-${ch.id}`} value={ch.id} />
              {ch.text}
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
