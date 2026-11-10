import { isStaffRole } from "@/lib/roles";
import { rankRows } from "@/lib/live";
import { json, getLiveCaller, readLiveRows } from "@/lib/live-server";

export async function GET(req, { params }) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser } = caller;

    const { id } = await params;
    if (!id) {
      return json({ error: "Session id is required" }, 400);
    }

    // 1. Fetch live_sessions
    const { data: sessionRow, error: sErr } = await db
      .from("live_sessions")
      .select("id, title, host_id, total, team_mode, phase, course_id, created_at, ended_at")
      .eq("id", id)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!sessionRow) {
      return json({ error: "Session not found" }, 404);
    }

    // Auth: host of the session or staff
    const isHost = sessionRow.host_id === callerId;
    const isStaff = isStaffRole(dbUser.role);
    if (!isHost && !isStaff) {
      return json({ error: "Forbidden" }, 403);
    }

    // Session must be ended (409 otherwise)
    if (sessionRow.phase !== "ended") {
      return json({ error: "Session is not ended" }, 409);
    }

    // 2. Fetch live_players
    const { data: playersData, error: pErr } = await readLiveRows(() => db
      .from("live_players")
      .select("user_id, display_name, team_id")
      .eq("session_id", id).order("user_id"));
    if (pErr) throw pErr;

    // 3. Fetch live_teams if there are team IDs
    const teamIds = Array.from(
      new Set((playersData || []).map((p) => p.team_id).filter(Boolean))
    );
    const teamsMap = new Map();
    if (teamIds.length > 0) {
      const { data: tRows, error: tErr } = await db
        .from("live_teams")
        .select("id, name, color_no")
        .in("id", teamIds);
      if (tErr) throw tErr;
      (tRows || []).forEach((t) => teamsMap.set(t.id, t));
    }

    // 4. Aggregate answers in SQL, paging the per-player and per-question totals.
    const [{ data: totals, error: aErr }, { data: questionStats, error: qsErr }] = await Promise.all([
      readLiveRows(() => db.rpc("live_session_totals", { p_session: id }).order("user_id")),
      readLiveRows(() => db.rpc("live_question_stats", { p_session: id }).order("idx")),
    ]);
    if (aErr) throw aErr;
    if (qsErr) throw qsErr;

    const playerStats = new Map((totals || []).map((row) => [row.user_id, {
      score: Number(row.score), correct: Number(row.correct),
    }]));

    let players = (playersData || []).map((p) => {
      const stat = playerStats.get(p.user_id) || { score: 0, correct: 0 };
      const teamObj = p.team_id ? teamsMap.get(p.team_id) : null;
      return {
        userId: p.user_id,
        name: p.display_name,
        team: teamObj ? teamObj.name : null,
        score: stat.score,
        correct: stat.correct,
      };
    });

    // Sort players by score DESC, then correct DESC, then name ASC
    players.sort(
      (a, b) =>
        b.score - a.score ||
        b.correct - a.correct ||
        a.name.localeCompare(b.name, "th")
    );

    players = rankRows(players, "score");

    // 5. Teams: (team_mode only, from live_team_results joined to live_teams)
    let teams = [];
    if (sessionRow.team_mode) {
      const { data: teamResults, error: trErr } = await db
        .from("live_team_results")
        .select("score, members, team_id")
        .eq("session_id", id);
      if (trErr) throw trErr;

      const resultTeamIds = (teamResults || []).map((tr) => tr.team_id).filter(Boolean);
      const missingTeamIds = resultTeamIds.filter((tId) => !teamsMap.has(tId));
      if (missingTeamIds.length > 0) {
        const { data: missingRows, error: mErr } = await db
          .from("live_teams")
          .select("id, name, color_no")
          .in("id", missingTeamIds);
        if (mErr) throw mErr;
        (missingRows || []).forEach((t) => teamsMap.set(t.id, t));
      }

      teams = (teamResults || []).map((tr) => {
        const tInfo = teamsMap.get(tr.team_id) || {};
        return {
          name: tInfo.name || "ทีม",
          colorNo: tInfo.color_no || 1,
          score: tr.score,
          members: tr.members,
        };
      });

      teams.sort((a, b) => b.score - a.score || a.colorNo - b.colorNo);
      teams = rankRows(teams, "score");
    }

    // 6. Questions: [{ idx, text, correctPct, answered }] from snapshots and SQL stats.
    const { data: questionsData, error: qErr } = await readLiveRows(() => db
      .from("live_session_questions")
      .select("idx, text")
      .eq("session_id", id)
      .order("idx", { ascending: true }));
    if (qErr) throw qErr;

    const qStats = new Map((questionStats || []).map((row) => [row.idx, {
      answered: Number(row.answered), correct: Number(row.correct),
    }]));

    const questions = (questionsData || []).map((q) => {
      const stat = qStats.get(q.idx) || { answered: 0, correct: 0 };
      const correctPct =
        stat.answered > 0
          ? Math.round((stat.correct / stat.answered) * 100)
          : 0;
      return {
        idx: q.idx,
        text: q.text,
        correctPct,
        answered: stat.answered,
      };
    });

    return json({
      session: {
        title: sessionRow.title,
        created_at: sessionRow.created_at,
        ended_at: sessionRow.ended_at,
        team_mode: sessionRow.team_mode,
        total: sessionRow.total,
      },
      players,
      teams,
      questions,
    });
  } catch (err) {
    console.error("GET /api/live/[id]/results error:", err);
    return json({ error: err.message || "Internal server error" }, 500);
  }
}
