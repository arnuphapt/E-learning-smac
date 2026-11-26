"use client"

import { useState } from "react"
import Link from "next/link"
import { FileTextIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CalendarEvent, EventTone } from "./events"

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

export const toneClass: Record<EventTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  info: "bg-info-soft text-info",
  amber: "bg-amber-accent-soft text-amber-accent",
}

const dotClass: Record<EventTone, string> = {
  primary: "bg-primary",
  info: "bg-info",
  amber: "bg-amber-accent",
}

/** Month view: weekday header + 7-column grid; mobile shows day dots + selected day event list. */
export function MonthGrid({ viewed, today, events }: { viewed: Date; today: Date; events: CalendarEvent[] }) {
  const year = viewed.getFullYear()
  const month = viewed.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()
  const cells = Array.from({ length: Math.ceil((firstDow + daysInMonth) / 7) * 7 }, (_, i) => i - firstDow + 1)
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1

  const [selectedDay, setSelectedDay] = useState<number | null>(todayDay > 0 ? todayDay : 1)

  const byDay = new Map<number, CalendarEvent[]>()
  for (const e of events) {
    if (e.date.getFullYear() !== year || e.date.getMonth() !== month) continue
    byDay.set(e.date.getDate(), [...(byDay.get(e.date.getDate()) ?? []), e])
  }

  const activeDay = selectedDay && selectedDay <= daysInMonth ? selectedDay : 1
  const selectedEvents = byDay.get(activeDay) ?? []

  return (
    <Card className="min-w-0 flex-1 py-0">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DOW.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const inMonth = day >= 1 && day <= daysInMonth
            const num = inMonth ? day : day < 1 ? prevDays + day : day - daysInMonth
            const isToday = inMonth && day === todayDay
            const dayEvents = inMonth ? (byDay.get(day) ?? []) : []
            const isSelected = inMonth && day === activeDay

            return (
              <div
                key={i}
                className={cn(
                  "flex min-w-0 flex-col gap-1 overflow-hidden rounded-md border p-1 sm:h-24 sm:p-1.5 lg:h-28",
                  !inMonth && "bg-muted/40 text-muted-foreground",
                  isToday && "border-primary bg-primary/5",
                )}
              >
                {/* Mobile (<sm): 44px tap target button with dots */}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!inMonth}
                  onClick={() => inMonth && setSelectedDay(day)}
                  aria-label={inMonth ? `วันที่ ${day}${dayEvents.length ? ` (${dayEvents.length} รายการ)` : ""}` : undefined}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex h-11 w-full flex-col items-center justify-center gap-1 rounded p-0 text-xs font-medium sm:hidden",
                    isToday && "font-bold text-primary",
                    isSelected && "bg-primary-soft text-primary-soft-foreground",
                  )}
                >
                  <span>{num}</span>
                  {dayEvents.length > 0 && (
                    <span className="flex items-center gap-0.5" aria-hidden>
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <span key={j} className={cn("size-1.5 rounded-full", dotClass[e.tone])} />
                      ))}
                    </span>
                  )}
                </Button>

                {/* Desktop (>=sm): day number + event links */}
                <div className="hidden items-center justify-between sm:flex">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday && "bg-primary font-bold text-primary-foreground",
                    )}
                  >
                    {num}
                  </span>
                  {isToday && <span className="text-xs font-semibold text-primary">วันนี้</span>}
                </div>
                <div className="hidden flex-col gap-0.5 overflow-y-auto sm:flex">
                  {dayEvents.map((e, j) => (
                    <Link
                      key={j}
                      href={e.to}
                      title={e.title}
                      className={cn("flex min-h-6 items-center gap-1.5 rounded px-1.5 py-0.5 text-xs", toneClass[e.tone])}
                    >
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
                      <span className="truncate">{e.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile (<sm): selected day events list */}
        <div className="mt-3 border-t pt-3 sm:hidden">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            วันที่ {activeDay} ({selectedEvents.length} รายการ)
          </div>
          {selectedEvents.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">ไม่มีกำหนดส่งในวันนี้</p>
          ) : (
            <div className="grid gap-1">
              {selectedEvents.map((e, j) => (
                <Link key={j} href={e.to} className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted">
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", dotClass[e.tone])} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{e.title}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <FileTextIcon className="size-3" aria-hidden />
                      {e.course}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
