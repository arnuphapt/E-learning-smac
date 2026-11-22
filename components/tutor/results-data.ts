import { supabase } from "@/lib/supabase"
import type { ResultAttemptGroup, ResultAttemptInput, ResultUserRow } from "@/lib/tutor-results"

export type LoadedAttemptRow = ResultAttemptInput & { lesson_id: string }

export interface TutorUserEntry extends ResultUserRow {
  id: string
}

const PAGE = 1000 // PostgREST returns at most 1000 rows per request
const CHUNK = 100 // ids per .in() so the URL stays short

// Every attempt of the set's lessons, light columns only: the per-topic groups come out of the stored result with a JSON path,
// the per-question rows are fetched later, for one round, when a student is opened.
export async function loadAttempts(lessonIds: readonly string[]): Promise<LoadedAttemptRow[]> {
  const out: LoadedAttemptRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("tutor_attempts")
      .select("id, student_id, lesson_id, score, total, status, started_at, submitted_at, deadline_at, groups:result->analysis->groups")
      .in("lesson_id", lessonIds)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows: LoadedAttemptRow[] = data.map((a) => ({
      ...a,
      groups: Array.isArray(a.groups) ? (a.groups as unknown as ResultAttemptGroup[]) : null,
    }))
    out.push(...rows)
    if (data.length < PAGE) return out
  }
}

export async function loadUsers(ids: readonly string[]): Promise<Map<string, TutorUserEntry>> {
  const chunks: Array<readonly string[]> = []
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK))
  const res = await Promise.all(chunks.map((c) => supabase.from("users").select("id, name, email, student_no").in("id", c)))
  const map = new Map<string, TutorUserEntry>()
  for (const r of res) {
    if (r.error) throw r.error
    for (const u of r.data) map.set(u.id, u)
  }
  return map
}
