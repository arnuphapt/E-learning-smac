import type { Database } from "@/lib/database.types"

type CourseRow = Database["public"]["Views"]["courses"]["Row"]

export interface MappedCourse extends Omit<CourseRow, "lessons" | "progress"> {
  lessons: number
  progress: number
}

/** Course colour from the database (a hex string); falls back to the theme primary. */
export const heroColor = (hero: string | null | undefined) => (hero && hero.startsWith("#") ? hero : "var(--primary)")

/** Tint of the course colour for badge/icon backgrounds (computed from data, so inline). */
export const tint = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`

export const startLabel = (progress: number) => (progress >= 100 ? "ทบทวน" : progress > 0 ? "เรียนต่อ" : "เริ่มเรียน")
