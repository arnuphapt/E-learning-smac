import type { Database, Json } from "@/lib/database.types"

export type LessonRow = Pick<
  Database["public"]["Tables"]["lessons"]["Row"],
  | "id"
  | "course_id"
  | "index"
  | "title"
  | "duration"
  | "description"
  | "video"
  | "pretest"
  | "posttest"
  | "assignment"
  | "status"
  | "progress"
  | "watch_limit"
  | "allow_download"
  | "documents"
  | "video_url"
  | "video_path"
  | "allow_ai"
  | "has_docs"
  | "has_pretest"
  | "has_posttest"
  | "has_assignment"
>

export type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"]
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]
export type TestScoreRow = Database["public"]["Tables"]["test_scores"]["Row"]
export type StudentQuestionRow = Pick<
  Database["public"]["Views"]["questions_student"]["Row"],
  "id" | "no" | "type" | "text" | "choices" | "lesson_id" | "kind"
>

/** Settings the instructor stored in lessons.pretest / lessons.posttest. */
export interface TestConfig {
  required?: boolean
  due?: string | null
  due_time?: string | null
  time_limit?: number | string | null
  attempts?: string | number | null
  show_answers?: boolean | null
}

export interface LessonDocItem {
  name: string
  size?: string
  url: string
}

export interface QuestionChoiceItem {
  id: string
  text?: string
}

export function parseTestConfig(raw: Json | null | undefined): TestConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  return raw as TestConfig
}

export function parseDocs(raw: Json | null | undefined): LessonDocItem[] {
  if (!Array.isArray(raw)) return []
  return raw as unknown as LessonDocItem[]
}

export function parseChoices(raw: Json | null | undefined): QuestionChoiceItem[] {
  if (!Array.isArray(raw)) return []
  return raw as unknown as QuestionChoiceItem[]
}

export const isPastDue = (due: string | null | undefined, dueTime?: string | null) => {
  if (!due) return false
  return new Date() > new Date(`${due}T${dueTime || "23:59"}:00`)
}

/** "12 พ.ย. 2569 เวลา 23:59 น." */
export const formatDueThai = (dateStr: string | null | undefined, timeStr?: string | null) => {
  if (!dateStr) return ""
  const date = new Date(dateStr + "T" + (timeStr || "23:59") + ":00")
  const thDate = date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
  return `${thDate} เวลา ${timeStr || "23:59"} น.`
}
