import { NextResponse } from "next/server";
import { tutorCaller, tutorNotFound, loadOwnAttempt, settleAttempt, endedBody } from "@/lib/tutor-server";

// Submit the caller's tutor attempt. Identity = session; service role; scoring happens here only (settleAttempt).
//   POST /api/tutor/attempts/<attemptId>/submit
//   200 { state: "ended", status, score, total, submittedAt }
// Idempotent: an attempt that already ended returns its stored result unchanged. Past the deadline the attempt is
// force-ended as 'expired' (submitted_at = deadline_at) instead of 'submitted'. Score and total only: the full
// review (answers, keys, explanations) is ticket 05.

export async function POST(req, { params }) {
  try {
    const caller = await tutorCaller(req);
    if (caller.error) return caller.error;
    const { db, studentId } = caller;
    const { id } = await params;
    const attempt = await loadOwnAttempt(db, studentId, id);
    if (!attempt) return tutorNotFound();
    const ended = await settleAttempt(db, attempt, Date.now(), { submit: true });
    return NextResponse.json(endedBody(ended), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Tutor submit failed:", e?.message || e);
    return NextResponse.json({ error: "Failed to submit tutor attempt" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
