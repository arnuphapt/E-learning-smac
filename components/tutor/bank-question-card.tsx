import { CircleCheckIcon, CircleIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { Database, Json } from "@/lib/database.types"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { BankChoice } from "./bank-question-dialog"

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"]

export function parseBankChoices(raw: Json | null | undefined): BankChoice[] {
  if (!Array.isArray(raw)) return []
  return raw as unknown as BankChoice[]
}

/** One bank question: topic + warnings, text, choices (answer highlighted), explanation, edit/delete. `id` is the #q-<id> deep-link anchor. */
export function BankQuestionCard({
  q,
  no,
  topicName,
  onEdit,
  onDelete,
}: {
  q: QuestionRow
  no: number
  topicName?: string
  onEdit: () => void
  onDelete: () => void
}) {
  const label = String(no).padStart(2, "0")
  return (
    <Card id={"q-" + q.id}>
      <CardContent className="flex items-start gap-3">
        <div className="text-lg font-bold tabular-nums text-muted-foreground">{label}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {topicName ? <ToneBadge tone="primary">{topicName}</ToneBadge> : <ToneBadge tone="muted">ไม่มีหัวข้อ</ToneBadge>}
            {!q.explanation && <ToneBadge tone="warning">ยังไม่มีคำอธิบาย</ToneBadge>}
          </div>
          <div className="mb-2 text-sm font-semibold">{q.text}</div>
          <ul className="grid gap-1">
            {parseBankChoices(q.choices).map((c) => (
              <li key={c.id} className={cn("flex items-center gap-2 text-sm text-muted-foreground", c.id === q.answer && "font-semibold text-success")}>
                {c.id === q.answer ? <CircleCheckIcon className="size-3.5" /> : <CircleIcon className="size-3.5" />}
                {c.text}
                {c.id === q.answer && <span className="sr-only">(คำตอบที่ถูกต้อง)</span>}
              </li>
            ))}
          </ul>
          {q.explanation && <div className="mt-2 whitespace-pre-line text-xs text-muted-foreground">คำอธิบาย: {q.explanation}</div>}
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon" aria-label={`แก้ไขข้อสอบข้อ ${label}`} onClick={onEdit}>
            <PencilIcon />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`ลบข้อสอบข้อ ${label}`} onClick={onDelete}>
            <Trash2Icon />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
