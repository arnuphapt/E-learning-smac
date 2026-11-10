import { json, getLiveCaller } from "@/lib/live-server";

export async function POST(req, { params }) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const { id } = await params;
    if (!id) return json({ error: "Session not found" }, 404);

    const { data: session, error: sErr } = await db
      .from("live_sessions")
      .select("id, host_id, course_id, phase, team_mode")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) return json({ error: "Session not found" }, 404);

    if (session.host_id !== callerId) {
      return json({ error: "Forbidden" }, 403);
    }

    if (session.phase !== "lobby") {
      return json({ error: "Teams can only be changed during lobby phase" }, 409);
    }

    const body = await req.json().catch(() => null);
    const { user_id, team_id } = body || {};
    if (!user_id || typeof user_id !== "string" || !team_id || typeof team_id !== "string") {
      return json({ error: "user_id and team_id are required" }, 400);
    }

    const { data: status, error: moveErr } = await db.rpc("live_move_player", {
      p_session: id,
      p_user: user_id,
      p_team: team_id,
    });
    if (moveErr) throw moveErr;
    if (status === "closed") {
      return json({ error: "Teams can only be changed during lobby phase" }, 409);
    }
    if (status === "not_player") {
      return json({ error: "Player not found in this session" }, 404);
    }
    if (status === "invalid") {
      return json({ error: "Team does not belong to this course" }, 400);
    }
    if (status !== "ok") throw new Error("Unexpected team move status");

    return json({ ok: true, user_id, team_id });
  } catch (e) {
    console.error("Live update player team failed:", e?.message || e);
    return json({ error: "Failed to update player team" }, 500);
  }
}
