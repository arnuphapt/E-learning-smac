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

// Tutor bank editor: a choice id that is never reused, not even after a delete. Tutor rounds store the chosen id
// (tutor_answers.chosen, the settled result) and the review reads the choices live, so "first unused letter" would let a
// deleted trailing choice's id come back with new text. Ids are opaque to the exam / review / scoring (compared with ===,
// text displayed); the editor labels choices A, B, C... by position.
export function uniqueChoiceId() {
  return "x" + Date.now().toString(36) + crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36), "");
}
