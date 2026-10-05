// Student-side question reads: never selects the answer key.
// ponytail: the fallback to the base table is only for the window before 20261005010000 creates
// questions_student; remove it afterwards (after that migration students can't read `questions`).
const COLS = "id, no, type, text, choices, lesson_id, kind";

export async function loadStudentQuestions(supabase, lessonId, kind) {
  const build = (table) => {
    let q = supabase.from(table).select(COLS).eq("lesson_id", lessonId);
    if (kind) q = q.eq("kind", kind);
    return q.order("no", { ascending: true });
  };
  const res = await build("questions_student");
  return res.error ? build("questions") : res;
}
