import type { Json } from "@/lib/database.types"
import { parseTestConfig } from "../lesson/types"

export type EventTone = "primary" | "info"

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


/** Assignment due dates plus required Pre/Post-test due dates. Students never see items of draft lessons. */
export function buildEvents(assignments: CalendarAssignment[], lessons: CalendarLesson[], isStaff: boolean): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const a of assignments) {
    const lesson = lessons.find((l) => l.id === a.lesson_id)
    if ((!lesson || lesson.status === "draft") && !isStaff) continue
    if (!a.due) continue
    events.push({ title: a.title, course: a.course?.code || "NUR301", tone: "primary", to: "/s/assignment/" + a.id, date: new Date(a.due) })
  }

  for (const l of lessons) {
    if (l.status === "draft" && !isStaff) continue
    for (const [label, cfg] of [["Pre-test", parseTestConfig(l.pretest)], ["Post-test", parseTestConfig(l.posttest)]] as const) {
      if (cfg?.required && cfg.due) {
        events.push({
          title: `${label} บทที่ ${l.index} · ${l.title}`,
          course: l.course?.code || "NUR301",
          tone: "info",
          to: `/s/lesson/${l.id}`,
          date: new Date(cfg.due),
        })
      }
    }
  }
  return events
}
