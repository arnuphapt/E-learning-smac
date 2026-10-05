import { NextResponse } from "next/server";
import { tutorCaller, tutorNotFound, loadOwnAttempt, settleAttempt, endedBody } from "@/lib/tutor-server";

// Save ONE answer of the caller's open tutor attempt. Identity = session; service role. Changing an answer is the
// same call again (upsert) until the attempt ends. Ownership of the attempt is the access check (a round only exists
// for a student who passed the lesson lock when starting it).
//   POST /api/tutor/attempts/<attemptId>/answer   body { questionId, chosen }
//   200 { ok: true }                      saved
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
    const { questionId, chosen } = body || {};
    if (typeof questionId !== "string" || !questionId || typeof chosen !== "string" || !chosen) {
      return json({ error: "questionId and chosen are required" }, 400);
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

    const { error } = await db
      .from("tutor_answers")
      .upsert(
        { attempt_id: attempt.id, question_id: questionId, chosen, answered_at: new Date(nowMs).toISOString() }, // explicit: same clock as deadline_at
        { onConflict: "attempt_id,question_id" },
      );
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error("Tutor answer save failed:", e?.message || e);
    return json({ error: "Failed to save answer" }, 500);
  }
}
