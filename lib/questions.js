// Student-side question reads: never selects the answer key.
const COLS = "id, no, type, text, choices, lesson_id, kind";

export async function loadStudentQuestions(supabase, lessonId, kind) {
  let q = supabase.from("questions_student").select(COLS).eq("lesson_id", lessonId);
  if (kind) q = q.eq("kind", kind);
  return q.order("no", { ascending: true });
}
