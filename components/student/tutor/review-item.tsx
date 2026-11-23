import { ToneBadge, type StatusTone } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AskAi } from "@/components/tutor/ask-ai"
import { cn } from "@/lib/utils"
import type { TutorReviewEntry } from "./result-types"

const BADGE: Record<"correct" | "wrong" | "unanswered", [StatusTone, string]> = {
  correct: ["success", "ตอบถูก"],
  wrong: ["danger", "ตอบผิด"],
  unanswered: ["warning", "ไม่ได้ตอบ"],
}

/** One question of the review: the student's pick vs the answer key, the teacher's explanation and the "ask AI" panel. */
export function ReviewItem({ r, attemptId }: { r: TutorReviewEntry; attemptId: string }) {
  const [tone, label] = BADGE[r.unanswered ? "unanswered" : r.correct ? "correct" : "wrong"]
  const known = (choiceId: string | null) => r.choices.some((c) => c.id === choiceId)
  return (
    <Card className="mb-4">
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-bold">ข้อ {r.n}</span>
          <ToneBadge tone={tone}>{label}</ToneBadge>
          {r.topic && <Badge variant="outline">{r.topic}</Badge>}
        </div>
        {r.deleted ? (
          <p className="text-sm text-muted-foreground">ข้อนี้ถูกลบแล้ว</p>
        ) : (
          <>
            <p className="mb-3 font-semibold text-pretty">{r.text}</p>
            <div className="mb-3 flex flex-col gap-2.5">
              {r.choices.map((c) => {
                const isAnswer = c.id === r.answer
                const isChosen = c.id === r.chosen
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
                      isAnswer ? "border-success bg-success-soft" : isChosen ? "border-destructive bg-destructive/10" : "bg-card",
                    )}
                  >
                    <span className={cn("min-w-0 flex-1", (isChosen || isAnswer) && "font-semibold")}>{c.text}</span>
                    {isChosen && <ToneBadge tone={isAnswer ? "success" : "danger"}>คำตอบของคุณ</ToneBadge>}
                    {isAnswer && <ToneBadge tone="success">เฉลย</ToneBadge>}
                  </div>
                )
              })}
            </div>
            {r.chosen && !known(r.chosen) && <p className="mb-2 text-xs text-muted-foreground">คำตอบของคุณเป็นตัวเลือกที่ถูกแก้ไขหรือลบไปแล้ว</p>}
            {!known(r.answer) && <p className="mb-2 text-xs text-muted-foreground">ตัวเลือกที่เป็นเฉลยถูกแก้ไขหรือลบไปแล้ว</p>}
            <div className="mb-2 rounded-xl bg-muted p-3.5">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">คำอธิบายของอาจารย์</div>
              <p className="text-sm whitespace-pre-line text-pretty">{r.explanation || "อาจารย์ยังไม่ได้เขียนคำอธิบายข้อนี้"}</p>
            </div>
            <AskAi attemptId={attemptId} questionId={r.questionId} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
