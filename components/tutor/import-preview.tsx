import { CircleCheckIcon, CircleIcon } from "lucide-react"
import type { ImportedQuestionRow } from "@/lib/tutor-import"
import { ToneBadge } from "@/components/common/status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Parsed Excel rows with a tick per row; `failed` holds the reason of rows the last import attempt rejected. */
export function ImportPreview({
  rows,
  picked,
  failed,
  busy,
  onToggle,
  onToggleAll,
}: {
  rows: readonly ImportedQuestionRow[]
  picked: ReadonlySet<number>
  failed: Record<number, string>
  busy: boolean
  onToggle: (row: number) => void
  onToggleAll: () => void
}) {
  const allOn = rows.length > 0 && rows.every((q) => picked.has(q.row))
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center gap-3 border-b bg-muted px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
        <Checkbox checked={allOn} onCheckedChange={onToggleAll} disabled={busy} aria-label="เลือกทุกข้อ" />
        <span className="w-10">แถว</span>
        <span className="flex-1">โจทย์ / ตัวเลือก</span>
        <span className="hidden w-32 sm:block">หัวข้อ</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {rows.map((q) => (
          <Label
            key={q.row}
            htmlFor={`imp-${q.row}`}
            data-row={q.row}
            className={cn("flex cursor-pointer items-start gap-3 border-b px-3.5 py-3 font-normal last:border-b-0", !picked.has(q.row) && "opacity-50")}
          >
            <Checkbox id={`imp-${q.row}`} className="mt-0.5" checked={picked.has(q.row)} onCheckedChange={() => onToggle(q.row)} disabled={busy} aria-label={"นำเข้าแถว " + q.row} />
            <span className="w-10 pt-0.5 font-mono text-xs text-muted-foreground">{q.row}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-sm font-semibold">{q.text}</div>
              <div className="flex flex-col gap-1">
                {q.choices.map((c) => (
                  <div key={c.id} className={cn("flex items-center gap-2 text-xs text-muted-foreground", c.id === q.answer && "font-semibold text-success")}>
                    {c.id === q.answer ? <CircleCheckIcon className="size-3.5 shrink-0" /> : <CircleIcon className="size-3.5 shrink-0" />}
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
              {failed[q.row] && <div className="mt-1 text-xs font-semibold text-destructive">นำเข้าไม่สำเร็จ: {failed[q.row]}</div>}
            </div>
            <div className="hidden w-32 sm:block">{q.topicName ? <ToneBadge tone="primary">{q.topicName}</ToneBadge> : <ToneBadge tone="muted">ไม่มีหัวข้อ</ToneBadge>}</div>
          </Label>
        ))}
      </div>
    </div>
  )
}
