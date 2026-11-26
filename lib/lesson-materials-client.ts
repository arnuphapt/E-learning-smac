import type { Json, Database } from "./database.types"
import { supabase } from "./supabase"
import { materialSnapshot, validateMaterial, type MaterialKind, type MaterialPayload } from "./lesson-materials"

export type MaterialRow = Database["public"]["Tables"]["lesson_material_templates"]["Row"]

export async function listMaterials(kind: MaterialKind) {
  const rows: MaterialRow[] = []
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from("lesson_material_templates").select("*")
      .eq("kind", kind).order("title").order("id").range(start, start + 999)
    if (error) throw new Error(error.message)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

export async function saveMaterial(kind: MaterialKind, title: string, payload: MaterialPayload, id?: string) {
  const problem = validateMaterial(kind, title, payload)
  if (problem) throw new Error(problem)
  const fields = { kind, title: title.trim(), payload: materialSnapshot(payload) as unknown as Json }
  const query = id
    ? supabase.from("lesson_material_templates").update(fields).eq("id", id)
    : supabase.from("lesson_material_templates").insert(fields)
  const { error } = await query.select("id").single()
  if (error) throw new Error(error.message)
}
