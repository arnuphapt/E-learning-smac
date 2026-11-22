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

export interface AiQuotaError {
  code?: string;
  message?: string;
}

export interface AiQuotaClaimRow {
  claim_id: string | null;
  used: number;
}

export interface AiQuotaRpcDb {
  rpc(
    fn: "ai_quota_claim",
    args: {
      p_student: string;
      p_limit: number;
      p_mode: string;
      p_lesson: string | null;
      p_course: string | null;
      p_session: string | null;
    }
  ): PromiseLike<{ data: AiQuotaClaimRow[] | AiQuotaClaimRow | null; error: AiQuotaError | null }>;
}

export interface AiQuotaTableDb {
  from(table: "ai_chat_logs"): {
    update(values: { message: string; reply: string }): {
      eq(col: "id", val: string): PromiseLike<{ error: AiQuotaError | null }>;
    };
    delete(): {
      eq(col: "id", val: string): PromiseLike<{ error: AiQuotaError | null }>;
    };
  };
}

export interface ClaimAiQuotaArgs {
  studentId: string;
  limit: number;
  mode: string;
  lessonId?: string | null;
  courseId?: string | null;
  sessionId?: string | null;
}

export interface ClaimAiQuotaResult {
  claimId: string | null;
  used: number;
}

export interface ClaimAiQuotaFailOpenResult extends ClaimAiQuotaResult {
  failOpen?: boolean;
}

export async function claimAiQuota(
  db: AiQuotaRpcDb,
  { studentId, limit, mode, lessonId = null, courseId = null, sessionId = null }: ClaimAiQuotaArgs
): Promise<ClaimAiQuotaResult> {
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

// /api/ai/chat is live for every student, so it must keep working when the claim cannot be made:
//   - FK violation (23503: a made-up lessonContext id / courseId): retry ONCE without lesson/course. Counted, just not attached.
//   - any other error (function missing before migration 20261006040000 is applied, DB down): log it and fail OPEN
//     -> { claimId: null, used: 0, failOpen: true }; the caller continues without a claim and logs the turn the old way.
// Over the limit is NOT an error: { claimId: null, used: n } with failOpen unset, the caller answers 429.
// (The tutor explain route stays fail-closed and calls claimAiQuota directly.)
export async function claimAiQuotaFailOpen(
  db: AiQuotaRpcDb,
  args: ClaimAiQuotaArgs
): Promise<ClaimAiQuotaFailOpenResult> {
  const attempt = (a: ClaimAiQuotaArgs): Promise<ClaimAiQuotaResult | { error: unknown }> =>
    claimAiQuota(db, a).catch((error: unknown) => ({ error }));
  let r = await attempt(args);
  const errObj = (e: unknown): AiQuotaError | null =>
    typeof e === "object" && e !== null ? (e as AiQuotaError) : null;
  if ("error" in r && errObj(r.error)?.code === "23503" && (args.lessonId || args.courseId)) {
    console.error("[AI quota] claim hit a foreign key, retrying without lesson/course:", errObj(r.error)?.message);
    r = await attempt({ ...args, lessonId: null, courseId: null });
  }
  if ("error" in r) {
    console.error("[AI quota] claim failed, continuing without a claim:", errObj(r.error)?.message || r.error);
    return { claimId: null, used: 0, failOpen: true };
  }
  return r;
}

export async function fillAiClaim(
  db: AiQuotaTableDb,
  claimId: string,
  { message, reply }: { message: string; reply: string }
): Promise<void> {
  const { error } = await db.from("ai_chat_logs").update({ message, reply }).eq("id", claimId);
  if (error) throw error;
}

// Never throws: it runs in error paths. A claim that cannot be deleted is dropped by the next claim after 10 minutes.
export async function releaseAiClaim(db: AiQuotaTableDb, claimId: string): Promise<void> {
  try {
    const { error } = await db.from("ai_chat_logs").delete().eq("id", claimId);
    if (error) console.error("[AI quota] release failed:", error.message);
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? (e as { message: unknown }).message
          : e;
    console.error("[AI quota] release failed:", msg);
  }
}
