// Student-side question reads: never selects the answer key.
const COLS = "id, no, type, text, choices, lesson_id, kind";

export async function loadStudentQuestions(supabase, lessonId, kind) {
  let q = supabase.from("questions_student").select(COLS).eq("lesson_id", lessonId);
  if (kind) q = q.eq("kind", kind);
  return q.order("no", { ascending: true });
}

// First unused choice id: a, b, c, ... Existing ids are never re-lettered (stored answers reference them), so after
// deleting "b" from a,b,c the next new choice is "b" again, never a second "c". Past "z" -> "c26", "c27", ...
export function nextChoiceId(choices) {
  const used = new Set((choices || []).map((c) => c.id));
  for (let n = 0; ; n++) {
    const id = n < 26 ? String.fromCharCode(97 + n) : `c${n}`;
    if (!used.has(id)) return id;
  }
}
