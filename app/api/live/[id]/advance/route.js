import { nextPhase } from "@/lib/live";
import { json, getLiveCaller } from "@/lib/live-server";

export async function POST(req, { params }) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const { id } = await params;
    if (!id) return json({ error: "Session not found" }, 404);

    const body = await req.json().catch(() => null);
    const { action } = body || {};
    if (!action || typeof action !== "string") {
      return json({ error: "action is required" }, 400);
    }

    const { data: session, error: sErr } = await db
      .from("live_sessions")
      .select("id, host_id, phase, current_index, total")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) return json({ error: "Session not found" }, 404);

    if (session.host_id !== callerId) {
      return json({ error: "Forbidden" }, 403);
    }

    const ending = action === "end" || action === "finish";
    const next = session.phase === "ended" && ending
      ? { phase: "ended", index: session.current_index }
      : nextPhase(session.phase, action, {
          index: session.current_index,
          total: session.total,
        });
    if (!next) {
      return json({ error: "Invalid phase transition" }, 409);
    }

    if (ending) {
      const { data: status, error: rpcErr } = await db.rpc("live_session_end", {
        p_session: id,
        p_expected_phase: session.phase,
        p_expected_index: session.current_index,
      });
      if (rpcErr) throw rpcErr;
      if (status === "conflict") {
        return json({ error: "Conflict: session state has changed" }, 409);
      }
      return json({ phase: "ended", current_index: next.index });
    }

    const nowMs = Date.now();
    const updatePayload = {
      phase: next.phase,
      current_index: next.index,
    };

    if (next.phase === "question") {
      const { data: qData, error: qErr } = await db
        .from("live_session_questions")
        .select("time_limit_sec")
        .eq("session_id", id)
        .eq("idx", next.index)
        .maybeSingle();
      if (qErr) throw qErr;
      if (!qData) {
        return json({ error: "Question not found" }, 500);
      }

      const timeLimitSec = Number(qData.time_limit_sec) || 20;
      updatePayload.question_started_at = new Date(nowMs).toISOString();
      updatePayload.question_deadline_at = new Date(nowMs + timeLimitSec * 1000).toISOString();
    }

    const { data: updated, error: upErr } = await db
      .from("live_sessions")
      .update(updatePayload)
      .eq("id", id)
      .eq("phase", session.phase)
      .eq("current_index", session.current_index)
      .select("id");
    if (upErr) throw upErr;
    if (!updated || updated.length === 0) {
      return json({ error: "Conflict: session state has changed" }, 409);
    }

    return json({ phase: next.phase, current_index: next.index });
  } catch (e) {
    console.error("Live advance failed:", e?.message || e);
    return json({ error: "Failed to advance session" }, 500);
  }
}
