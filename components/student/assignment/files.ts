import type { Database, Json } from "@/lib/database.types"

export type RubricRow = Database["public"]["Tables"]["rubrics"]["Row"]

export interface AssignmentAttachment {
  name?: string
  size?: string
}

export interface RubricCriterion {
  id: string
  name: string
  desc?: string
  max: number
}

export function getFileName(filePath: string): string {
  if (!filePath) return ""
  try {
    const parts = filePath.split("/")
    return decodeURIComponent(parts[parts.length - 1].replace(/^\d+_/, ""))
  } catch {
    return filePath
  }
}

export function getFileTypeAndSize(filePath: string): string {
  if (!filePath) return "เอกสารแนบ"
  const ext = filePath.split(".").pop()?.toUpperCase()
  return ext ? `${ext} · เอกสารส่งงาน` : "เอกสารส่งงาน"
}

export function getCriteriaList(rubric: RubricRow | null): RubricCriterion[] {
  if (!rubric || !Array.isArray(rubric.criteria)) return []
  return (rubric.criteria as readonly unknown[]).filter(
    (c): c is RubricCriterion =>
      Boolean(c) &&
      typeof c === "object" &&
      !Array.isArray(c) &&
      typeof (c as { id?: unknown }).id === "string" &&
      typeof (c as { max?: unknown }).max === "number",
  )
}

export function getAttachmentList(attachments: Json | null): AssignmentAttachment[] {
  if (!Array.isArray(attachments)) return []
  return (attachments as readonly unknown[]).filter(
    (f): f is AssignmentAttachment => Boolean(f) && typeof f === "object" && !Array.isArray(f),
  )
}
