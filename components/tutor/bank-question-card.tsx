import { CircleCheckIcon, CircleIcon } from "lucide-react"
import type { Database, Json } from "@/lib/database.types"
import { cn } from "@/lib/utils"
import type { BankChoice } from "./bank-question-dialog"

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"]

export function parseBankChoices(raw: Json | null | undefined): BankChoice[] {
  if (!Array.isArray(raw)) return []
  return raw as unknown as BankChoice[]
}

/** Question text, choices (answer highlighted) and explanation for a bank table row. `id` is the #q-<id> deep-link anchor. */
export function BankQuestionCell({ q }: { q: QuestionRow }) {
  return (
    <div id={"q-" + q.id} className="min-w-0 scroll-mt-24">
      <div className="mb-2 text-sm font-semibold">{q.text}</div>
      <ul className="grid gap-1">
        {parseBankChoices(q.choices).map((c) => (
          <li key={c.id} className={cn("flex items-center gap-2 text-sm text-muted-foreground", c.id === q.answer && "font-semibold text-success")}>
            {c.id === q.answer ? <CircleCheckIcon className="size-3.5 shrink-0" /> : <CircleIcon className="size-3.5 shrink-0" />}
            {c.text}
            {c.id === q.answer && <span className="sr-only">(คำตอบที่ถูกต้อง)</span>}
          </li>
        ))}
      </ul>
      {q.explanation && <div className="mt-2 whitespace-pre-line text-xs text-muted-foreground">คำอธิบาย: {q.explanation}</div>}
    </div>
  )
}
