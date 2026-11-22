import type { Database } from "@/lib/database.types"

type CourseAllRow = Database["public"]["Tables"]["courses_all"]["Row"]

/** One tutor set of the /i/tutor list with its lesson / bank counters. */
export interface TutorSetSummary extends CourseAllRow {
  lessonCount: number
  published: number
  questions: number
  short: number
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message
    return typeof msg === "string" ? msg : ""
  }
  return String(err)
}
