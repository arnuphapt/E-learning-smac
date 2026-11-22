import type { Database } from "@/lib/database.types"

export type TermRow = Database["public"]["Tables"]["terms"]["Row"]
export type SubjectGroupRow = Database["public"]["Tables"]["subject_groups"]["Row"]
export type SectionRow = Database["public"]["Tables"]["sections"]["Row"]

/** Form state of the new-course page. */
export interface CourseDraft {
  title: string
  code: string
  subtitle: string
  color: string
  term: string
  credits: string
  subjectGroup: string
  section: string
  yearLevels: string[]
  /** null = not touched yet, defaults to the signed-in user. */
  mainManagers: string[] | null
  coInstructors: string[]
}

/** Preset cover colours; stored as the course's `hero` value. */
export const COURSE_COLORS = ["#0d6e8c", "#1e5fa8", "#2f7d5b", "#5b4b9e", "#b4530b", "#0b1220"]
