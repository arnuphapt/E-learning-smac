import type { Json } from "@/lib/database.types"
import type { ResultRow } from "@/lib/tutor-analysis"
import { ToneBadge } from "@/components/common/status-badge"
import { cn } from "@/lib/utils"

interface ReviewChoice {
  id: string
  text?: string
}

export interface ReviewQuestion {
  id: string
  text: string | null
  choices: Json | null
}

const TONE = { correct: "success", wrong: "danger", unanswered: "warning" } as const
const LABEL = { correct: "ตอบถูก", wrong: "ตอบผิด", unanswered: "ไม่ได้ตอบ" }

/** One question of a stored round: result badge, text, choices with the right answer and the student's pick marked. */
export function RoundReview({ n, row, q }: { n: number; row: ResultRow; q?: ReviewQuestion }) {
  const state = row.unanswered ? "unanswered" : row.correct ? "correct" : "wrong"
  const choices = Array.isArray(q?.choices)
    ? (q.choices as readonly unknown[]).filter(
        (c): c is ReviewChoice => Boolean(c) && typeof c === "object" && !Array.isArray(c) && typeof (c as { id?: unknown }).id === "string",
      )
    : []
  return (
    <div className="flex gap-3 rounded-lg border p-3.5">
      <span className="w-8 shrink-0 font-mono text-sm font-semibold tabular-nums text-primary">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <ToneBadge tone={TONE[state]}>{LABEL[state]}</ToneBadge>
          {row.topic && <ToneBadge tone="muted">{row.topic}</ToneBadge>}
        </div>
        {!q ? (
          <div className="text-sm text-muted-foreground">ข้อนี้ถูกลบแล้ว</div>
        ) : (
          <>
            <div className="mb-2 text-sm font-semibold">{q.text}</div>
            <div className="grid gap-1.5">
              {choices.map((c) => {
                const isAnswer = c.id === row.answer
                const isChosen = c.id === row.chosen
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      isAnswer && "border-success bg-success-soft",
                      isChosen && !isAnswer && "border-destructive bg-destructive/10",
                    )}
                  >
                    <span className="min-w-0 flex-1">{c.text}</span>
                    {isChosen && <span className="text-xs font-semibold text-muted-foreground">นักศึกษาตอบ</span>}
                    {isAnswer && <span className="text-xs font-semibold text-success">เฉลย</span>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
