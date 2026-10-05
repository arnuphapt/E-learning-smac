// Server-only: the daily AI quota as an atomic claim (migration 20261006040000_ai_quota_claim.sql).
// Used by /api/ai/chat and /api/tutor/attempts/<id>/explain. `db` = supabaseAdmin() (service role): the function is
// EXECUTE-able by service_role only, and studentId must come from the verified session, never from a request body.
//
//   claimAiQuota -> { claimId, used }
//     claimId = id of a placeholder ai_chat_logs row (message "" / reply "") inserted under a per-student lock; null when
//     the student is at the limit (used = today's count). used on success includes this claim.
//   fillAiClaim     after Gemini answered: write the real message + reply into the claim row.
//   releaseAiClaim  when the call failed: delete the claim so a failed call is not counted.
// Placeholder rows have reply = "": every history reader filters `reply <> ''`.

export async function claimAiQuota(db, { studentId, limit, mode, lessonId = null, courseId = null, sessionId = null }) {
  const { data, error } = await db.rpc("ai_quota_claim", {
    p_student: studentId,
    p_limit: limit,
    p_mode: mode,
    p_lesson: lessonId,
    p_course: courseId,
    p_session: sessionId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("ai_quota_claim returned no row");
  return { claimId: row.claim_id ?? null, used: row.used };
}

export async function fillAiClaim(db, claimId, { message, reply }) {
  const { error } = await db.from("ai_chat_logs").update({ message, reply }).eq("id", claimId);
  if (error) throw error;
}

// Never throws: it runs in error paths. A claim that cannot be deleted is dropped by the next claim after 10 minutes.
export async function releaseAiClaim(db, claimId) {
  try {
    const { error } = await db.from("ai_chat_logs").delete().eq("id", claimId);
    if (error) console.error("[AI quota] release failed:", error.message);
  } catch (e) {
    console.error("[AI quota] release failed:", e?.message || e);
  }
}
