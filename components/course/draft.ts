import type { Database } from "@/lib/database.types"

export type TermRow = Database["public"]["Tables"]["terms"]["Row"]
export type SubjectGroupRow = Database["public"]["Tables"]["subject_groups"]["Row"]
export type SectionRow = Database["public"]["Tables"]["sections"]["Row"]

/** Form state of the new-course page. */
export interface CourseDraft {
  title: string
  code: string
  subtitle: string
  term: string
  credits: string
  subjectGroup: string
  section: string
  yearLevels: string[]
  /** null = not touched yet, defaults to the signed-in user. */
  mainManagers: string[] | null
  coInstructors: string[]
}
