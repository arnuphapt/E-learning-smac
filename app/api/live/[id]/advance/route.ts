import { type NextRequest } from "next/server";
import { nextPhase } from "@/lib/live";
import { json, getLiveCaller } from "@/lib/live-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const { id } = await params;
    if (!id) return json({ error: "Session not found" }, 404);

    const rawBody: unknown = await req.json().catch(() => null);
    const action =
      rawBody && typeof rawBody === "object" && "action" in rawBody
        ? (rawBody as { action?: unknown }).action
        : undefined;
    if (!action || typeof action !== "string") {
      return json({ error: "action is required" }, 400);
    }

    const ending = action === "end" || action === "finish";

    if (!ending) {
      // Host check, transition and question timer stamp happen in one locked RPC
      // (transitions mirror nextPhase in lib/live.ts).
      const { data: adv, error: advErr } = await db
        .rpc("live_session_advance", {
          p_session: id,
          p_host: callerId,
          p_action: action,
          p_now: new Date().toISOString(),
        })
        .single();
      if (advErr) throw advErr;
      switch (adv.status) {
        case "ok":
          return json({ phase: adv.phase, current_index: adv.current_index });
        case "not_found":
          return json({ error: "Session not found" }, 404);
        case "forbidden":
          return json({ error: "Forbidden" }, 403);
        case "question_not_found":
          return json({ error: "Question not found" }, 500);
        default:
          return json({ error: "Invalid phase transition" }, 409);
      }
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

    const next = session.phase === "ended"
      ? { phase: "ended", index: session.current_index }
      : nextPhase(session.phase, action, {
          index: session.current_index,
          total: session.total,
        });
    if (!next) {
      return json({ error: "Invalid phase transition" }, 409);
    }

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
  } catch (e) {
    console.error("Live advance failed:", e instanceof Error ? e.message : e);
    return json({ error: "Failed to advance session" }, 500);
  }
}
