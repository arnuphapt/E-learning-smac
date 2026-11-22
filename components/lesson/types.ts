import type { Database, Json } from "@/lib/database.types"

export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"]
export type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"]
export type CourseAllRow = Database["public"]["Tables"]["courses_all"]["Row"]
export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"]
export type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"]
export type RubricRow = Database["public"]["Tables"]["rubrics"]["Row"]

export type LessonTab = "video" | "docs" | "test" | "assign"

export type OnSaveLesson = (fields: LessonUpdate) => Promise<void> | void

export interface TestConfig {
  required?: boolean
  passing_score?: number | null
  time_limit?: number | null
  attempts?: string
  shuffle?: boolean
  show_answers?: boolean
  due?: string | null
  due_time?: string | null
  [key: string]: unknown
}

export interface DocItem {
  name: string
  size: string
  path?: string
  url: string
}

export interface ChoiceItem {
  id: string
  text: string
}

export interface RubricCriterion {
  id: string
  name: string
  desc?: string
  max: number
}

export interface QuestionEditorItem {
  id: string
  no: number | null
  type: string | null
  text: string
  choices: ChoiceItem[]
  answer: string
}

export function parseTestConfig(raw: Json | null | undefined): TestConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return raw as TestConfig
}

export function parseDocs(raw: Json | null | undefined): DocItem[] {
  if (!Array.isArray(raw)) return []
  return raw as unknown as DocItem[]
}

export function parseChoices(raw: Json | null | undefined): ChoiceItem[] {
  if (!Array.isArray(raw)) return []
  return raw as unknown as ChoiceItem[]
}

export function parseCriteria(raw: Json | null | undefined): RubricCriterion[] {
  if (!Array.isArray(raw)) return []
  return raw as unknown as RubricCriterion[]
}

export const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Keeps only digits, clamps to 23:59 and inserts the colon while typing a due time. */
export function maskTime(val: string) {
  let cleaned = val.replace(/[^0-9]/g, "").slice(0, 4)
  if (cleaned.length >= 2) {
    const hh = parseInt(cleaned.slice(0, 2), 10)
    if (hh > 23) cleaned = "23" + cleaned.slice(2)
  }
  if (cleaned.length >= 4) {
    const mm = parseInt(cleaned.slice(2, 4), 10)
    if (mm > 59) cleaned = cleaned.slice(0, 2) + "59"
  }
  return cleaned.length > 2 ? cleaned.slice(0, 2) + ":" + cleaned.slice(2) : cleaned
}

export const errMsg = (error: unknown) => (error instanceof Error ? error.message : String(error))
