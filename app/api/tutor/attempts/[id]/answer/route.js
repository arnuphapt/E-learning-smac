import { NextResponse } from "next/server";
import { tutorCaller, tutorNotFound, loadOwnAttempt, settleAttempt, endedBody } from "@/lib/tutor-server";

// Save ONE answer of the caller's open tutor attempt. Identity = session; service role. Changing an answer is the
// same call again with a newer seq until the attempt ends. Ownership of the attempt is the access check (a round only exists
// for a student who passed the lesson lock when starting it).
//   POST /api/tutor/attempts/<attemptId>/answer   body { questionId, chosen, seq }
//   seq = a positive integer that grows with every click on the same question (the exam page sends a server-clock-based
//   value). The write only applies when seq is greater than the stored one (tutor_answer_save, migration 20261006020000), so
//   a request the browser aborted that reaches the server late cannot overwrite a newer answer.
//   200 { ok: true, applied: true }       saved
//   200 { ok: true, applied: false }      a newer (or equal) answer is already stored: nothing changed
//   409 { state: "ended", score, total }  the attempt is over (submitted, or past its deadline: finalized + scored here)
// Never returns keys, correctness or the other answers.

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export async function POST(req, { params }) {
  try {
    const caller = await tutorCaller(req);
    if (caller.error) return caller.error;
    const { db, studentId } = caller;
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const { questionId, chosen, seq } = body || {};
    if (typeof questionId !== "string" || !questionId || typeof chosen !== "string" || !chosen || !Number.isSafeInteger(seq) || seq <= 0) {
      return json({ error: "questionId, chosen and seq are required" }, 400);
    }

    const nowMs = Date.now(); // one server reading: checked against deadline_at AND stamped as answered_at
    let attempt = await loadOwnAttempt(db, studentId, id);
    if (!attempt) return tutorNotFound();
    // ended, or in_progress past the deadline (finalized + scored right here): reject, the answer is never stored
    attempt = await settleAttempt(db, attempt, nowMs);
    if (attempt.status !== "in_progress") return json(endedBody(attempt), 409);

    if (!attempt.question_ids.includes(questionId)) return json({ error: "Invalid answer" }, 400);
    const { data: question, error: qErr } = await db
      .from("questions")
      .select("choices")
      .eq("id", questionId)
      .eq("lesson_id", attempt.lesson_id)
      .eq("kind", "tutor")
      .maybeSingle();
    if (qErr) throw qErr;
    if (!question || !(question.choices || []).some((c) => c.id === chosen)) return json({ error: "Invalid answer" }, 400);

    const { data: applied, error } = await db.rpc("tutor_answer_save", {
      p_attempt: attempt.id,
      p_question: questionId,
      p_chosen: chosen,
      p_seq: seq,
      p_answered_at: new Date(nowMs).toISOString(), // explicit: same clock as deadline_at
    });
    if (error) throw error;
    return json({ ok: true, applied: applied === true });
  } catch (e) {
    console.error("Tutor answer save failed:", e?.message || e);
    return json({ error: "Failed to save answer" }, 500);
  }
}
