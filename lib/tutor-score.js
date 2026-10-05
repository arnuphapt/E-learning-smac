// Pure scoring of one tutor attempt. No imports: safe for server and node --test. The server is the only caller that
// matters: correctness is never computed or stored on the client.
//
// questionIds: the locked order of the round (tutor_attempts.question_ids)
// keys:        [{ id, answer }]  questions.answer = the correct choice id (same comparison as lib/grading.js: strict ===)
// answers:     [{ question_id, chosen, answered_at }]  tutor_answers rows of the attempt
// deadlineAt:  tutor_attempts.deadline_at; only answers with answered_at <= deadline_at count
//
// Returns { score, total, rows } with one row per question in the locked order:
//   { question_id, chosen: <choice id> | null, correct: boolean, unanswered: boolean }
// An unanswered question (no answer, or only a late one) is wrong in the score but flagged unanswered, so the review
// can say "ไม่ได้ตอบ" instead of "wrong". A late answer is dropped entirely: chosen is null for it.
// A question with no key (deleted / retyped mid-round) can never be correct. total = questionIds.length.
export function scoreAttempt({ questionIds, keys, answers, deadlineAt }) {
  const deadline = Date.parse(deadlineAt);
  const keyOf = new Map(keys.map((k) => [k.id, k.answer]));
  const chosenOf = new Map(
    answers.filter((a) => typeof a.chosen === "string" && Date.parse(a.answered_at) <= deadline).map((a) => [a.question_id, a.chosen]),
  );
  const rows = questionIds.map((id) => {
    const chosen = chosenOf.get(id) ?? null;
    return { question_id: id, chosen, correct: chosen !== null && chosen === keyOf.get(id), unanswered: chosen === null };
  });
  return { score: rows.filter((r) => r.correct).length, total: rows.length, rows };
}
