import { PlusIcon } from "lucide-react"
import { bankWarning } from "@/lib/tutor-bank"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { BankStats, WorkspaceLesson } from "./workspace-data"

/** Left rail of the tutor workspace: every lesson with its publish state and bank health. */
export function LessonRail({
  lessons,
  bank,
  selected,
  onPick,
  onAdd,
}: {
  lessons: WorkspaceLesson[]
  bank: Record<string, BankStats>
  selected: string | null
  onPick: (id: string) => void
  onAdd: () => void
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b py-3.5">
        <CardTitle className="text-base">บทเรียน ({lessons.length})</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <PlusIcon />
          เพิ่มบทเรียน
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {lessons.length === 0 && <div className="p-5 text-sm text-muted-foreground">ยังไม่มีบทเรียน กด “เพิ่มบทเรียน” เพื่อสร้างบทแรก แล้วเพิ่มวิดีโอและข้อสอบในคลัง</div>}
        {lessons.map((l) => {
          const b = bank[l.id] || { count: 0, topics: 0 }
          const warn = bankWarning(b.count, l.tutor_draw_count)
          const on = l.id === selected
          return (
            <Button
              key={l.id}
              variant="ghost"
              className={cn("h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-none border-b px-4 py-3 text-left last:border-b-0", on && "bg-primary-soft hover:bg-primary-soft")}
              onClick={() => onPick(l.id)}
              aria-current={on}
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs font-semibold tabular-nums text-primary", on && "bg-primary text-primary-foreground")}>
                {String(l.index ?? "").padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{l.title || "(ไม่มีชื่อบทเรียน)"}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal text-muted-foreground">
                  <ToneBadge tone={l.status === "active" ? "success" : "muted"}>{l.status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</ToneBadge>
                  <span className="tabular-nums">คลัง {b.count} ข้อ</span>
                  {warn && <ToneBadge tone="warning">คลังไม่พอ</ToneBadge>}
                </span>
              </span>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
