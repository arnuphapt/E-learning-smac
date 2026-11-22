import type { Database, Json } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { visibleTutorSets, type BankRowInput } from "@/lib/tutor-bank"

type QuestionSelectRow = Pick<Database["public"]["Tables"]["questions"]["Row"], "id" | "no" | "text" | "choices" | "answer" | "topic_id" | "lesson_id">

export type BankCourseRow = Pick<Database["public"]["Tables"]["courses_all"]["Row"], "id" | "code" | "title" | "group_id">

export interface BankLessonRow {
  id: string
  course_id: string
  index: number | null
  title: string
}

export interface BankQuestionRow extends BankRowInput {
  id: string
  no: number
  text: string
  lessonId: string
  setId: string
  topic: string
  answerText: string
}

export interface BankData {
  sets: BankCourseRow[]
  lessons: BankLessonRow[]
  rows: BankQuestionRow[]
  setById: Map<string, BankCourseRow>
  lessonById: Map<string, BankLessonRow>
}

interface ChoiceEntry {
  id?: string
  text?: string
}

function parseChoices(raw: Json | null): ChoiceEntry[] {
  if (!Array.isArray(raw)) return []
  const res: ChoiceEntry[] = []
  for (const item of raw) {
    if (typeof item === "object" && item !== null) {
      const rec = item as { id?: unknown; text?: unknown }
      res.push({
        id: typeof rec.id === "string" ? rec.id : undefined,
        text: typeof rec.text === "string" ? rec.text : undefined,
      })
    }
  }
  return res
}

// PostgREST returns at most 1000 rows per request: read the tutor bank in pages so a big bank is not cut silently.
async function allTutorQuestions(): Promise<QuestionSelectRow[]> {
  const out: QuestionSelectRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, no, text, choices, answer, topic_id, lesson_id")
      .eq("kind", "tutor")
      .order("lesson_id")
      .order("no")
      .order("id")
      .range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) return out
  }
}

/** Every tutor bank question the caller manages, with set / lesson lookups. Same data path and visibility rule as /i/tutor. Throws on a read error. */
export async function loadTutorBank(user: Parameters<typeof visibleTutorSets>[1], userId: string): Promise<BankData> {
  const [cRes, lRes, ciRes, topicRes, questions] = await Promise.all([
    supabase.from("courses_all").select("id, code, title, group_id").eq("kind", "tutor").order("code"),
    supabase.from("lessons").select("id, course_id, index, title"),
    supabase.from("course_instructors").select("course_id").eq("user_id", userId),
    supabase.from("tutor_topics").select("id, name"),
    allTutorQuestions(),
  ])
  const err = cRes.error || lRes.error || ciRes.error || topicRes.error
  if (err) throw err
  const sets = visibleTutorSets(cRes.data, user, (ciRes.data || []).map((ci) => ci.course_id))
  const setById = new Map(sets.map((c) => [c.id, c]))
  const setOrder = new Map(sets.map((c, i) => [c.id, i]))
  const lessons = (lRes.data || [])
    .filter((l): l is BankLessonRow => Boolean(l.course_id && setById.has(l.course_id)))
    .sort((a, b) => (setOrder.get(a.course_id) ?? 0) - (setOrder.get(b.course_id) ?? 0) || (a.index ?? 0) - (b.index ?? 0))
  const lessonById = new Map(lessons.map((l) => [l.id, l]))
  const topicById = new Map((topicRes.data || []).map((t) => [t.id, t.name]))
  const lessonOrder = new Map(lessons.map((l, i) => [l.id, i]))
  const rows: BankQuestionRow[] = questions
    .filter((r): r is QuestionSelectRow & { lesson_id: string } => Boolean(r.lesson_id && lessonById.has(r.lesson_id)))
    .map((r) => {
      const parentLesson = lessonById.get(r.lesson_id)
      return {
        id: r.id,
        no: r.no || 0,
        text: r.text || "",
        lessonId: r.lesson_id,
        setId: parentLesson ? parentLesson.course_id : "",
        topic: (r.topic_id ? topicById.get(r.topic_id) : undefined) || "",
        answerText: parseChoices(r.choices).find((c) => c.id === r.answer)?.text || "",
      }
    })
    .sort((a, b) => (lessonOrder.get(a.lessonId) ?? 0) - (lessonOrder.get(b.lessonId) ?? 0) || a.no - b.no)
  return { sets, lessons, rows, setById, lessonById }
}
