import { type NextRequest } from "next/server";
import { rankRows } from "@/lib/live";
import { json, getLiveCaller, readLiveRows } from "@/lib/live-server";

interface LivePlayerHistoryRow {
  session_id: string;
  user_id: string;
  team_id: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    // 1. Fetch player records for caller
    const { data: myPlayerRows, error: pErr } = await readLiveRows(() => db
      .from("live_players")
      .select("session_id, team_id")
      .eq("user_id", callerId).order("session_id"));
    if (pErr) throw pErr;

    if (!myPlayerRows || myPlayerRows.length === 0) {
      return json([]);
    }

    const mySessionIds = myPlayerRows.map((r) => r.session_id);

    // 2. Fetch ended sessions for these session IDs, newest first, limit 50
    const { data: endedSessions, error: sErr } = await db
      .from("live_sessions")
      .select("id, title, ended_at, created_at")
      .in("id", mySessionIds)
      .eq("phase", "ended")
      .order("ended_at", { ascending: false, nullsFirst: false })
      .limit(50);
    if (sErr) throw sErr;

    if (!endedSessions || endedSessions.length === 0) {
      return json([]);
    }

    const targetSessionIds = endedSessions.map((s) => s.id);

    // 3. Fetch all players in these ended sessions (to get playerCount, caller's team, and rank calculation)
    const { data: allPlayers, error: apErr } = await readLiveRows(() => db
      .from("live_players")
      .select("session_id, user_id, team_id")
      .in("session_id", targetSessionIds).order("session_id").order("user_id"));
    if (apErr) throw apErr;

    // 4. Fetch team names for any teams involved
    const teamIds = Array.from(
      new Set((allPlayers || []).map((p) => p.team_id).filter((tId): tId is string => Boolean(tId)))
    );
    const teamsMap = new Map<string, string>();
    if (teamIds.length > 0) {
      const { data: teamRows, error: tErr } = await readLiveRows(() => db
        .from("live_teams")
        .select("id, name")
        .in("id", teamIds).order("id"));
      if (tErr) throw tErr;
      (teamRows || []).forEach((t) => teamsMap.set(t.id, t.name));
    }

    // 5. Fetch per-player SQL totals, never the individual answer rows.
    const sessionScores = new Map<string, Map<string, number>>(
      await Promise.all(
        targetSessionIds.map(async (sessionId): Promise<[string, Map<string, number>]> => {
          const { data: totals, error } = await readLiveRows(() => db
            .rpc("live_session_totals", { p_session: sessionId }).order("user_id"));
          if (error) throw error;
          return [sessionId, new Map((totals || []).map((row) => [row.user_id, Number(row.score)]))];
        })
      )
    );

    // Map: sessionId -> list of players in that session
    const sessionPlayersMap = new Map<string, LivePlayerHistoryRow[]>();
    for (const p of allPlayers || []) {
      let list = sessionPlayersMap.get(p.session_id);
      if (!list) {
        list = [];
        sessionPlayersMap.set(p.session_id, list);
      }
      list.push(p);
    }

    // Build history items
    const history = endedSessions.map((s) => {
      const playersInSession = sessionPlayersMap.get(s.id) || [];
      const userScores = sessionScores.get(s.id) || new Map<string, number>();

      // Find caller's team
      const callerPlayer = playersInSession.find((p) => p.user_id === callerId);
      const teamName = callerPlayer?.team_id ? teamsMap.get(callerPlayer.team_id) ?? null : null;

      // Compute rank among all players in this session
      const scoredPlayers = rankRows(playersInSession.map((p) => ({
        userId: p.user_id,
        score: userScores.get(p.user_id) || 0,
      })), "score");

      const callerScore = userScores.get(callerId) || 0;
      const rank = scoredPlayers.find((p) => p.userId === callerId)?.rank ?? null;

      return {
        id: s.id,
        title: s.title,
        endedAt: s.ended_at,
        score: callerScore,
        rank,
        playerCount: playersInSession.length,
        team: teamName,
      };
    });

    return json(history);
  } catch (err) {
    console.error("GET /api/live/history error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message || "Internal server error" }, 500);
  }
}
