import { CircleCheckIcon, CircleIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { ToneBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { parseChoices, type QuestionRow } from "./types"

/** One question with its choices; the correct one is highlighted. */
export function QuestionCard({ q, no, onEdit, onDelete }: { q: QuestionRow; no: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <ToneBadge tone="primary">ข้อ {no}</ToneBadge>
            <Badge variant="outline">{q.type === "truefalse" ? "ถูก/ผิด" : "ปรนัย"}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">1 คะแนน</span>
          </div>
          <div className="mb-2 text-sm font-semibold">{q.text}</div>
          <ul className="grid gap-1">
            {parseChoices(q.choices).map((c) => (
              <li key={c.id} className={cn("flex items-center gap-2 text-sm text-muted-foreground", c.id === q.answer && "font-semibold text-success")}>
                {c.id === q.answer ? <CircleCheckIcon className="size-3.5" /> : <CircleIcon className="size-3.5" />}
                {c.text}
                {c.id === q.answer && <span className="sr-only">(คำตอบที่ถูกต้อง)</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon" aria-label={`แก้ไขข้อ ${no}`} onClick={onEdit}>
            <PencilIcon />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`ลบข้อ ${no}`} onClick={onDelete}>
            <Trash2Icon />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
