import type { Database } from "@/lib/database.types"

export type AiChatLogRow = Database["public"]["Tables"]["ai_chat_logs"]["Row"]

export interface EnrichedAiLog extends AiChatLogRow {
  studentName: string
  studentNo: string | null
  lessonIndex: number | string | null
  lessonTitle: string
  courseCode: string | null
  courseTitle: string | null
}
