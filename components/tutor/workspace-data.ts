import type { Json, Database } from "@/lib/database.types"
import type { TutorLessonDoc, TutorLessonItem } from "./lesson-types"

type LessonRow = Database["public"]["Tables"]["lessons"]["Row"]

export interface WorkspaceLesson extends TutorLessonItem {
  id: string
  course_id?: string | null
  index: number | null
  title?: string | null
  description?: string | null
  status: string | null
  tutor_draw_count?: number | null
}

export interface BankStats {
  count: number
  topics: number
}

function parseDocList(raw: Json | null): TutorLessonDoc[] | null {
  if (!Array.isArray(raw)) return null
  const docs: TutorLessonDoc[] = []
  for (const item of raw) {
    if (typeof item === "object" && item !== null) {
      const rec = item as { name?: unknown; size?: unknown; path?: unknown; url?: unknown }
      docs.push({
        name: typeof rec.name === "string" ? rec.name : String(rec.name ?? ""),
        size: typeof rec.size === "string" ? rec.size : String(rec.size ?? ""),
        ...(typeof rec.path === "string" ? { path: rec.path } : {}),
        url: typeof rec.url === "string" ? rec.url : String(rec.url ?? ""),
      })
    }
  }
  return docs
}

export function toWorkspaceLesson(row: LessonRow): WorkspaceLesson {
  return {
    ...row,
    documents: parseDocList(row.documents),
    ai_documents: parseDocList(row.ai_documents),
  }
}
