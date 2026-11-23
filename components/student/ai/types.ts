import type { Database, Json } from "@/lib/database.types"

export type CourseRow = Database["public"]["Views"]["courses"]["Row"]
export type AiLogRow = Database["public"]["Tables"]["ai_chat_logs"]["Row"]

export interface StudentLessonRow {
  id: string
  course_id: string | null
  index: number | null
  title: string
  description: string | null
  duration: string | null
  status: string | null
  allow_ai: boolean | null
  documents: Json | null
}

export interface LessonDoc {
  name: string
  url: string
  size?: string
  path?: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  attachments?: LessonDoc[]
}

export interface ChatSession {
  id: string
  createdAt: string | null
  updatedAt: string | null
  firstQuestion: string
  logs: AiLogRow[]
}

export interface RateLimitInfo {
  used: number
  limit: number
}

export type AiStatus = "checking" | "online" | "offline" | "degraded"
