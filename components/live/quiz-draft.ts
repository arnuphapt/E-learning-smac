import type { Database, Json } from "@/lib/database.types";
import { POINTS_DEFAULT, type QuizProblem } from "@/lib/live";
import { supabase } from "@/lib/supabase";
import type { QuizChoice, QuizQuestion } from "@/components/live/quiz-question-editor";

type LiveQuizQuestionRow = Database["public"]["Tables"]["live_quiz_questions"]["Row"];

export interface QuizQuestionDraftItem extends QuizQuestion {
  no: number;
  text: string;
  choices: QuizChoice[];
  answer: string;
  time_limit_sec: number;
  points: number;
}

export function parseChoices(raw: Json): QuizChoice[] {
  if (!Array.isArray(raw)) return [];
  const result: QuizChoice[] = [];
  for (const item of raw) {
    if (typeof item === "object" && item !== null) {
      const rec = item as { id?: unknown; text?: unknown };
      result.push({
        id: typeof rec.id === "string" ? rec.id : String(rec.id ?? ""),
        text: typeof rec.text === "string" ? rec.text : String(rec.text ?? ""),
      });
    }
  }
  return result;
}

export function toQuestionDraftItem(row: LiveQuizQuestionRow): QuizQuestionDraftItem {
  return {
    id: row.id,
    no: row.no,
    text: row.text,
    choices: parseChoices(row.choices),
    answer: row.answer,
    time_limit_sec: row.time_limit_sec,
    points: row.points,
  };
}

export function emptyDraftQuestion(
  no: number,
  defaults?: { time_limit_sec?: number; points?: number },
): QuizQuestionDraftItem {
  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    no,
    text: "",
    choices: [
      { id: "a", text: "" },
      { id: "b", text: "" },
    ],
    answer: "",
    time_limit_sec: defaults?.time_limit_sec ?? 20,
    points: defaults?.points ?? POINTS_DEFAULT,
  };
}

export function mostCommonValue<T>(values: T[], fallback: T): T {
  if (values.length === 0) return fallback;
  const counts = new Map<T, number>();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const next = (counts.get(v) ?? 0) + 1;
    counts.set(v, next);
    if (next > bestCount) {
      best = v;
      bestCount = next;
    }
  }
  return best;
}

export function toQuestionUpdateRow(q: {
  text: string;
  choices: QuizChoice[];
  answer: string;
  time_limit_sec: number;
  points: number;
}) {
  return {
    text: q.text,
    choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
    answer: q.answer,
    time_limit_sec: q.time_limit_sec,
    points: q.points,
  };
}

export function toQuestionInsertRow(
  quizId: string,
  q: {
    no: number;
    text: string;
    choices: QuizChoice[];
    answer: string;
    time_limit_sec: number;
    points: number;
  },
) {
  return {
    quiz_id: quizId,
    no: q.no,
    ...toQuestionUpdateRow(q),
  };
}

export function groupProblemsByIndex(problems: QuizProblem[]): Record<number, QuizProblem[]> {
  const map: Record<number, QuizProblem[]> = {};
  for (const p of problems) {
    if (p.index >= 0) {
      if (!map[p.index]) map[p.index] = [];
      map[p.index].push(p);
    }
  }
  return map;
}

export async function loadQuizForEdit(quizId: string) {
  const { data: quizData, error: quizError } = await supabase
    .from("live_quizzes")
    .select("id, title")
    .eq("id", quizId)
    .maybeSingle();

  if (quizError) throw quizError;
  if (!quizData) throw new Error("ไม่พบชุดควิซนี้");

  const { data: questionsData, error: questionsError } = await supabase
    .from("live_quiz_questions")
    .select("id, quiz_id, no, text, choices, answer, time_limit_sec, points")
    .eq("quiz_id", quizId)
    .order("no", { ascending: true });

  if (questionsError) throw questionsError;

  return {
    id: quizData.id,
    title: quizData.title || "",
    questions: (questionsData || []).map(toQuestionDraftItem),
  };
}

export async function createQuizWithQuestions({
  title,
  ownerId,
  questions,
}: {
  title: string;
  ownerId: string;
  questions: QuizQuestionDraftItem[];
}): Promise<string> {
  const { data: newQuiz, error: quizError } = await supabase
    .from("live_quizzes")
    .insert([{ title, owner_id: ownerId }])
    .select("id")
    .single();

  if (quizError) throw quizError;

  if (questions.length > 0) {
    const rows = questions.map((q, idx) => toQuestionInsertRow(newQuiz.id, { ...q, no: idx + 1 }));
    const { error: qError } = await supabase.from("live_quiz_questions").insert(rows);
    if (qError) {
      await supabase.from("live_quizzes").delete().eq("id", newQuiz.id);
      throw qError;
    }
  }

  return newQuiz.id;
}

/** Non-transactional multi-step save: updates title, deletes removed questions, updates existing ones, inserts new ones. */
export async function saveQuizEdits({
  quizId,
  title,
  questions,
  initialIds,
}: {
  quizId: string;
  title: string;
  questions: QuizQuestionDraftItem[];
  initialIds: Set<string>;
}) {
  const { error: titleError } = await supabase
    .from("live_quizzes")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", quizId);

  if (titleError) throw titleError;

  const currentExistingIds = new Set(questions.filter((q) => initialIds.has(q.id)).map((q) => q.id));
  const deletedIds = Array.from(initialIds).filter((id) => !currentExistingIds.has(id));

  if (deletedIds.length > 0) {
    const { error: delError } = await supabase
      .from("live_quiz_questions")
      .delete()
      .eq("quiz_id", quizId)
      .in("id", deletedIds);
    if (delError) throw delError;
  }

  const resequenced = questions.map((q, idx) => ({ ...q, no: idx + 1 }));
  const existingToUpdate = resequenced.filter((q) => initialIds.has(q.id));
  for (const q of existingToUpdate) {
    const { error: updError } = await supabase
      .from("live_quiz_questions")
      .update({ no: q.no, ...toQuestionUpdateRow(q) })
      .eq("id", q.id)
      .eq("quiz_id", quizId);
    if (updError) throw updError;
  }

  const newToInsert = resequenced.filter((q) => !initialIds.has(q.id));
  if (newToInsert.length > 0) {
    const { error: insError } = await supabase
      .from("live_quiz_questions")
      .insert(newToInsert.map((q) => toQuestionInsertRow(quizId, q)));
    if (insError) throw insError;
  }
}
