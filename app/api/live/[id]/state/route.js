import { teamScore, rankRows } from "@/lib/live";
import { json, getLiveCaller, readLiveRows } from "@/lib/live-server";

async function getLobbyState(db, session, { isHost, callerId }) {
  if (session.team_mode) {
    const [{ data: teamsData, error: tErr }, { data: rows, error: pErr }] = await Promise.all([
      db
        .from("live_teams")
        .select("id, name, color_no")
        .eq("course_id", session.course_id)
        .order("color_no", { ascending: true }),
      readLiveRows(() => db
        .from("live_players")
        .select("user_id, display_name, joined_at, team_id")
        .eq("session_id", session.id)
        .order("joined_at", { ascending: true })
        .order("user_id")),
    ]);
    if (tErr) throw tErr;
    if (pErr) throw pErr;

    const players = rows || [];
    const teams = (teamsData || []).map((t) => ({
      id: t.id,
      name: t.name,
      colorNo: t.color_no,
      players: players.filter((p) => p.team_id === t.id).map((p) => ({
        userId: p.user_id,
        name: p.display_name,
      })),
    }));

    if (isHost) {
      return {
        phaseState: {
          players: players.map((r) => ({
            userId: r.user_id,
            name: r.display_name,
            joinedAt: r.joined_at,
          })),
          teams,
        },
        phaseMe: {},
      };
    } else {
      const myPlayer = players.find((p) => p.user_id === callerId);
      const myTeam = myPlayer?.team_id
        ? (teamsData || []).find((t) => t.id === myPlayer.team_id)
        : null;

      return {
        phaseState: {
          players: players.length,
        },
        phaseMe: {
          team: myTeam
            ? {
                id: myTeam.id,
                name: myTeam.name,
                colorNo: myTeam.color_no,
              }
            : null,
        },
      };
    }
  }

  if (isHost) {
    const { data: rows, error } = await readLiveRows(() => db
      .from("live_players")
      .select("user_id, display_name, joined_at")
      .eq("session_id", session.id)
      .order("joined_at", { ascending: true }).order("user_id"));
    if (error) throw error;

    return {
      phaseState: {
        players: (rows || []).map((r) => ({
          userId: r.user_id,
          name: r.display_name,
          joinedAt: r.joined_at,
        })),
      },
      phaseMe: {},
    };
  } else {
    const { count, error } = await db
      .from("live_players")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id);
    if (error) throw error;

    return {
      phaseState: {
        players: count ?? 0,
      },
      phaseMe: {},
    };
  }
}

async function computeTeamStandings(db, session, callerId) {
  const [{ data: teamsData, error: tErr }, { data: playerRows, error: pErr }, { data: totals, error: aErr }] =
    await Promise.all([
      db
        .from("live_teams")
        .select("id, name, color_no")
        .eq("course_id", session.course_id)
        .order("color_no", { ascending: true }),
      readLiveRows(() => db
        .from("live_players")
        .select("user_id, display_name, team_id")
        .eq("session_id", session.id).order("user_id")),
      readLiveRows(() => db.rpc("live_session_totals", { p_session: session.id }).order("user_id")),
    ]);
  if (tErr) throw tErr;
  if (pErr) throw pErr;
  if (aErr) throw aErr;

  const scoreMap = new Map((totals || []).map((row) => [row.user_id, Number(row.score)]));

  const players = playerRows || [];
  const teams = teamsData || [];

  const teamsList = teams.map((t) => ({
    id: t.id,
    name: t.name,
    colorNo: t.color_no,
  }));

  const teamBoard = rankRows(teamsList.map((team) => {
    const members = players.filter((p) => p.team_id === team.id);
    return {
      ...team,
      score: teamScore(members.map((p) => scoreMap.get(p.user_id) || 0)),
      members: members.length,
    };
  }), "score");

  const callerPlayer = players.find((p) => p.user_id === callerId);
  let meTeam = null;
  if (callerPlayer && callerPlayer.team_id) {
    const callerTeamObj = teamsList.find((t) => t.id === callerPlayer.team_id);
    const standing = teamBoard.find((t) => t.id === callerPlayer.team_id);
    if (callerTeamObj) {
      meTeam = {
        ...callerTeamObj,
        rank: standing?.rank ?? null,
      };
    }
  }

  return { teamBoard, meTeam, teams: teamsList };
}

async function computeSessionStandings(db, sessionId, callerId) {
  const { data: playerRows, error: pErr } = await readLiveRows(() => db
    .from("live_players")
    .select("user_id, display_name, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true }).order("user_id"));
  if (pErr) throw pErr;

  const players = playerRows || [];
  const playerCount = players.length;

  const { data: totals, error: aErr } = await readLiveRows(() => db
    .rpc("live_session_totals", { p_session: sessionId }).order("user_id"));
  if (aErr) throw aErr;

  const scoreMap = new Map((totals || []).map((row) => [row.user_id, Number(row.score)]));

  const standings = players.map((p) => ({
    userId: p.user_id,
    name: p.display_name,
    joinedAt: p.joined_at,
    score: scoreMap.get(p.user_id) || 0,
  }));

  standings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.joinedAt).getTime();
    const timeB = new Date(b.joinedAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.userId.localeCompare(b.userId);
  });

  const ranked = rankRows(standings, "score");
  const callerStanding = ranked.find((s) => s.userId === callerId);

  const top5 = ranked.slice(0, 5).map((s) => ({
    userId: s.userId,
    name: s.name,
    score: s.score,
    rank: s.rank,
  }));

  const top3 = ranked.slice(0, 3).map((s) => ({
    userId: s.userId,
    name: s.name,
    score: s.score,
    rank: s.rank,
  }));

  return {
    playerCount,
    top5,
    top3,
    meTotalScore: callerStanding ? callerStanding.score : 0,
    meRank: callerStanding?.rank ?? null,
  };
}

async function getQuestionTeam(db, sessionId, callerId) {
  const { data: player, error: pErr } = await db.from("live_players")
    .select("team_id").eq("session_id", sessionId).eq("user_id", callerId).maybeSingle();
  if (pErr) throw pErr;
  if (!player?.team_id) return null;

  const { data: team, error: tErr } = await db
    .from("live_teams")
    .select("id, name, color_no")
    .eq("id", player.team_id)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!team) return null;
  return { id: team.id, name: team.name, colorNo: team.color_no };
}

export async function GET(req, { params }) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const { id } = await params;
    if (!id) return json({ error: "Not found" }, 404);

    const { data: session, error: sErr } = await db
      .from("live_sessions")
      .select(
        "id, title, pin, phase, total, current_index, team_mode, restrict_to_course, host_id, course_id, question_started_at, question_deadline_at"
      )
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) return json({ error: "Not found" }, 404);

    const isHost = session.host_id === callerId;
    if (!isHost) {
      const { data: player, error: pErr } = await db
        .from("live_players")
        .select("user_id")
        .eq("session_id", id)
        .eq("user_id", callerId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!player) {
        return json({ error: "Not found" }, 404);
      }
    }

    let phaseState = {};
    let phaseMe = {};

    switch (session.phase) {
      case "lobby": {
        const lobbyData = await getLobbyState(db, session, { isHost, callerId });
        phaseState = lobbyData.phaseState;
        phaseMe = lobbyData.phaseMe;
        break;
      }

      case "question": {
        const [
          { data: qData, error: qErr },
          { data: myAnswer, error: myErr },
          { count: answeredCount, error: aErr },
          { count: playerCount, error: pErr },
          meTeam,
        ] = await Promise.all([
          db.from("live_session_questions")
            .select("text, choices, time_limit_sec")
            .eq("session_id", session.id).eq("idx", session.current_index).maybeSingle(),
          db.from("live_answers").select("chosen")
            .eq("session_id", session.id).eq("question_idx", session.current_index)
            .eq("user_id", callerId).maybeSingle(),
          isHost
            ? db.from("live_answers").select("*", { count: "exact", head: true })
                .eq("session_id", session.id).eq("question_idx", session.current_index)
            : Promise.resolve({}),
          isHost
            ? db.from("live_players").select("*", { count: "exact", head: true }).eq("session_id", session.id)
            : Promise.resolve({}),
          session.team_mode && !isHost ? getQuestionTeam(db, session.id, callerId) : Promise.resolve(null),
        ]);
        if (qErr) throw qErr;
        if (myErr) throw myErr;
        if (aErr) throw aErr;
        if (pErr) throw pErr;

        phaseState = {
          index: session.current_index,
          total: session.total,
          deadline: session.question_deadline_at
            ? new Date(session.question_deadline_at).toISOString()
            : null,
          now: new Date().toISOString(),
          question: qData
            ? {
                text: qData.text,
                choices: qData.choices,
                time_limit_sec: qData.time_limit_sec,
              }
            : null,
          ...(isHost ? { answeredCount: answeredCount ?? 0, playerCount: playerCount ?? 0 } : {}),
        };

        phaseMe = {
          answered: !!myAnswer,
          chosen: myAnswer ? myAnswer.chosen : null,
          ...(session.team_mode && !isHost ? { team: meTeam } : {}),
        };
        break;
      }

      case "reveal": {
        const [
          { data: qData, error: qErr },
          { data: myAnswer, error: myErr },
          { data: questionStats, error: qaErr },
        ] = await Promise.all([
          db.from("live_session_questions")
            .select("text, choices, time_limit_sec, answer")
            .eq("session_id", session.id)
            .eq("idx", session.current_index)
            .maybeSingle(),
          db.from("live_answers")
            .select("chosen, correct, points")
            .eq("session_id", session.id)
            .eq("question_idx", session.current_index)
            .eq("user_id", callerId)
            .maybeSingle(),
          db.rpc("live_question_stats", { p_session: session.id })
            .eq("idx", session.current_index).maybeSingle(),
        ]);
        if (qErr) throw qErr;
        if (myErr) throw myErr;
        if (qaErr) throw qaErr;

        const distribution = {};
        if (qData && Array.isArray(qData.choices)) {
          for (const c of qData.choices) {
            if (c && c.id) distribution[c.id] = 0;
          }
        }
        Object.assign(distribution, questionStats?.choice_counts || {});

        let teamCorrect = undefined;
        let teams = undefined;
        let meTeam = undefined;

        if (session.team_mode) {
          const [
            { data: teamsData, error: tErr },
            { data: playerRows, error: pErr },
          ] = await Promise.all([
            db
              .from("live_teams")
              .select("id, name, color_no")
              .eq("course_id", session.course_id)
              .order("color_no", { ascending: true }),
            readLiveRows(() => db
              .from("live_players")
              .select("user_id, team_id")
              .eq("session_id", session.id).order("user_id")),
          ]);
          if (tErr) throw tErr;
          if (pErr) throw pErr;

          const teamIds = (teamsData || []).map((t) => t.id);

          teamCorrect = {};
          for (const tid of teamIds) {
            const stat = questionStats?.team_stats?.[tid];
            teamCorrect[tid] = !!stat && Number(stat.members) > 0 && Number(stat.correct) > Number(stat.members) / 2;
          }

          teams = (teamsData || []).map((t) => ({
            id: t.id,
            name: t.name,
            colorNo: t.color_no,
          }));

          const callerPlayer = (playerRows || []).find((p) => p.user_id === callerId);
          if (callerPlayer && callerPlayer.team_id) {
            const callerTeamObj = (teamsData || []).find((t) => t.id === callerPlayer.team_id);
            if (callerTeamObj) {
              meTeam = {
                id: callerTeamObj.id,
                name: callerTeamObj.name,
                colorNo: callerTeamObj.color_no,
              };
            }
          }
        }

        const standings = await computeSessionStandings(db, session.id, callerId);

        phaseState = {
          index: session.current_index,
          total: session.total,
          deadline: session.question_deadline_at
            ? new Date(session.question_deadline_at).toISOString()
            : null,
          now: new Date().toISOString(),
          question: qData
            ? {
                text: qData.text,
                choices: qData.choices,
                time_limit_sec: qData.time_limit_sec,
                answer: qData.answer,
              }
            : null,
          answer: qData ? qData.answer : null,
          distribution,
          ...(session.team_mode ? { teamCorrect, teams } : {}),
          ...(isHost
            ? {
                answeredCount: Number(questionStats?.answered) || 0,
                playerCount: standings.playerCount,
              }
            : {}),
        };

        phaseMe = {
          answered: !!myAnswer,
          chosen: myAnswer ? myAnswer.chosen : null,
          correct: myAnswer ? myAnswer.correct : false,
          points: myAnswer ? myAnswer.points : 0,
          totalScore: standings.meTotalScore,
          rank: standings.meRank,
          ...(session.team_mode && !isHost ? { team: meTeam } : {}),
        };
        break;
      }

      case "leaderboard": {
        const standings = await computeSessionStandings(db, session.id, callerId);

        let teamBoard = undefined;
        let meTeam = undefined;
        if (session.team_mode) {
          const tStandings = await computeTeamStandings(db, session, callerId);
          teamBoard = tStandings.teamBoard;
          meTeam = tStandings.meTeam;
        }

        phaseState = {
          index: session.current_index,
          total: session.total,
          top5: standings.top5,
          playerCount: standings.playerCount,
          ...(session.team_mode ? { teamBoard } : {}),
        };

        phaseMe = {
          totalScore: standings.meTotalScore,
          rank: standings.meRank,
          playerCount: standings.playerCount,
          ...(session.team_mode && !isHost ? { team: meTeam } : {}),
        };
        break;
      }

      case "ended": {
        const standings = await computeSessionStandings(db, session.id, callerId);

        let teamBoard = undefined;
        let meTeam = undefined;
        let teams = undefined;
        if (session.team_mode) {
          const tStandings = await computeTeamStandings(db, session, callerId);
          teamBoard = tStandings.teamBoard;
          meTeam = tStandings.meTeam;
          teams = tStandings.teams;
        }

        phaseState = {
          index: session.current_index,
          total: session.total,
          top5: standings.top5,
          top3: standings.top3,
          playerCount: standings.playerCount,
          ...(session.team_mode ? { teamBoard, teams } : {}),
        };

        phaseMe = {
          totalScore: standings.meTotalScore,
          rank: standings.meRank,
          playerCount: standings.playerCount,
          ...(session.team_mode && !isHost ? { team: meTeam } : {}),
        };
        break;
      }

      default:
        break;
    }

    const response = {
      id: session.id,
      title: session.title,
      ...(isHost ? { pin: session.pin } : {}),
      phase: session.phase,
      total: session.total,
      current_index: session.current_index,
      team_mode: session.team_mode,
      restrict_to_course: session.restrict_to_course,
      me: {
        userId: callerId,
        isHost,
        ...phaseMe,
      },
      ...phaseState,
    };

    return json(response);
  } catch (e) {
    console.error("Live session state failed:", e?.message || e);
    return json({ error: "Failed to load live session state" }, 500);
  }
}
