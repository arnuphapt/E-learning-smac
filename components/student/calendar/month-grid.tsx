import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CalendarEvent, EventTone } from "./events"

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

export const toneClass: Record<EventTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  info: "bg-info-soft text-info",
}

/** Month view: weekday header + 7-column grid of days, each listing that day's events as links. */
export function MonthGrid({ viewed, today, events }: { viewed: Date; today: Date; events: CalendarEvent[] }) {
  const year = viewed.getFullYear()
  const month = viewed.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()
  const cells = Array.from({ length: Math.ceil((firstDow + daysInMonth) / 7) * 7 }, (_, i) => i - firstDow + 1)
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1

  const byDay = new Map<number, CalendarEvent[]>()
  for (const e of events) {
    if (e.date.getFullYear() !== year || e.date.getMonth() !== month) continue
    byDay.set(e.date.getDate(), [...(byDay.get(e.date.getDate()) ?? []), e])
  }

  return (
    <Card className="min-w-0 flex-1 py-0">
      <CardContent className="p-4">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DOW.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-semibold text-muted-foreground sm:text-xs">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const inMonth = day >= 1 && day <= daysInMonth
            const num = inMonth ? day : day < 1 ? prevDays + day : day - daysInMonth
            const isToday = inMonth && day === todayDay
            return (
              <div
                key={i}
                className={cn(
                  "flex h-16 min-w-0 flex-col gap-0.5 overflow-hidden rounded-md border p-1 sm:h-20 sm:p-1.5 lg:h-24",
                  !inMonth && "bg-muted/40 text-muted-foreground",
                  isToday && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium sm:text-xs">{num}</span>
                  {isToday && <Badge className="h-4 px-1.5 text-[9px]">วันนี้</Badge>}
                </div>
                {inMonth &&
                  (byDay.get(day) ?? []).map((e, j) => (
                    <Link
                      key={j}
                      href={e.to}
                      title={e.title}
                      className={cn("flex items-center gap-1 truncate rounded px-1 py-px text-[9px] sm:text-[11px]", toneClass[e.tone])}
                    >
                      <span aria-hidden className="size-1 shrink-0 rounded-full bg-current sm:size-1.5" />
                      <span className="truncate">{e.title}</span>
                    </Link>
                  ))}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
