import type { Json } from "@/lib/database.types"
import { parseTestConfig } from "../lesson/types"

export type EventTone = "primary" | "info" | "amber"

export interface CalendarAssignment {
  id: string
  title: string
  due: string | null
  lesson_id: string | null
  course: { code: string | null } | null
}

export interface CalendarLesson {
  id: string
  index: number | null
  title: string
  status: string | null
  pretest: Json | null
  posttest: Json | null
  course: { code: string | null } | null
}

export interface CalendarEvent {
  title: string
  course: string
  tone: EventTone
  to: string
  date: Date
}

function isDueSoon(date: Date, now: Date) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const left = Math.ceil((date.getTime() - todayStart.getTime()) / 86_400_000)
  return left >= 0 && left <= 3
}

/** Assignment due dates plus required Pre/Post-test due dates. Students never see items of draft lessons. */
export function buildEvents(
  assignments: CalendarAssignment[],
  lessons: CalendarLesson[],
  isStaff: boolean,
  now = new Date(),
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const a of assignments) {
    const lesson = lessons.find((l) => l.id === a.lesson_id)
    if ((!lesson || lesson.status === "draft") && !isStaff) continue
    if (!a.due) continue
    const date = new Date(a.due)
    events.push({
      title: a.title,
      course: a.course?.code || "NUR301",
      tone: isDueSoon(date, now) ? "amber" : "primary",
      to: "/s/assignment/" + a.id,
      date,
    })
  }

  for (const l of lessons) {
    if (l.status === "draft" && !isStaff) continue
    for (const [label, cfg] of [["Pre-test", parseTestConfig(l.pretest)], ["Post-test", parseTestConfig(l.posttest)]] as const) {
      if (cfg?.required && cfg.due) {
        const date = new Date(cfg.due)
        events.push({
          title: `${label} บทที่ ${l.index} · ${l.title}`,
          course: l.course?.code || "NUR301",
          tone: isDueSoon(date, now) ? "amber" : "info",
          to: `/s/lesson/${l.id}`,
          date,
        })
      }
    }
  }
  return events
}
