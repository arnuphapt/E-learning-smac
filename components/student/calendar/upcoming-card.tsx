import Link from "next/link"
import { CalendarIcon, ClockIcon, FileTextIcon } from "lucide-react"
import { EmptyState } from "@/components/common/states"
import { ToneBadge } from "@/components/common/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CalendarEvent } from "./events"
import { toneClass } from "./month-grid"

const MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

/** Deadlines from today on (sorted), each with days-left badge; plus the colour legend. */
export function UpcomingCard({ events, today }: { events: CalendarEvent[]; today: Date }) {
  return (
    <div className="flex w-full flex-col gap-4 lg:w-78 lg:shrink-0">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClockIcon className="size-4 text-primary" />
            กำหนดส่งที่ใกล้ถึง
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-1 px-2">
          {events.length === 0 ? (
            <EmptyState icon={<CalendarIcon />} title="ไม่มีกำหนดส่งเร็วๆ นี้" className="p-4" />
          ) : (
            events.map((e, i) => {
              const left = Math.ceil((e.date.getTime() - today.getTime()) / 86_400_000)
              return (
                <Link key={i} href={e.to} className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted">
                  <div className={cn("w-11 shrink-0 rounded-lg py-1.5 text-center", toneClass[e.tone])}>
                    <div className="text-xs leading-none font-semibold">{MONTHS_SHORT[e.date.getMonth()]}</div>
                    <div className="text-lg leading-tight font-bold tabular-nums">{e.date.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{e.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <FileTextIcon className="size-3" />
                      {e.course}
                    </div>
                  </div>
                  <ToneBadge tone={left <= 3 ? "warning" : "muted"} className="shrink-0">{left === 0 ? "วันนี้" : "อีก " + left + " วัน"}</ToneBadge>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2 text-sm">
          <div className="font-bold">ประเภทกำหนดส่ง</div>
          {[
            ["bg-primary", "ใบงาน / งานที่มอบหมาย"],
            ["bg-info", "แบบทดสอบ Pre / Post-test"],
            ["bg-warning", "ใกล้ครบกำหนด"],
          ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span aria-hidden className={cn("size-2.5 rounded-sm", color)} />
              {label}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
