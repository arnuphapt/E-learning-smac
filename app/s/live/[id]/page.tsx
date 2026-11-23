"use client";

import { useParams } from "next/navigation";
import { PlayerQuestion } from "@/components/live/player-question";
import { PlayerReveal } from "@/components/live/player-reveal";
import { PlayerLeaderboard } from "@/components/live/player-leaderboard";
import { PlayerEnded } from "@/components/live/player-ended";
import { LobbyView } from "@/components/student/live/lobby-view";
import { PlayerHeader } from "@/components/student/live/player-header";
import { PlayerScreen } from "@/components/student/live/player-screen";
import { PlayerConnecting, PlayerLoadError } from "@/components/student/live/player-status";
import { TeamBoard } from "@/components/student/live/team-board";
import { TeamRankBanner } from "@/components/student/live/team-rank-banner";
import { usePlayerSession } from "@/components/student/live/use-player-session";

// Student side of a live quiz room. The phase (lobby / question / reveal / leaderboard / ended) comes from the polled session.
export default function StudentLiveSessionPage() {
  const rawId = useParams()?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const s = usePlayerSession(id);
  const { state, activeTeam } = s;

  if (!s.mounted) return null;
  if (s.error) return <PlayerLoadError message={s.error.message} onRetry={() => s.refresh()} />;
  if (!state) return <PlayerConnecting />;

  const teamBoard = Array.isArray(state.teamBoard) ? state.teamBoard : [];
  return (
    <PlayerScreen bgUrl={s.bgUrl} className="select-none justify-between">
      <PlayerHeader
        title={state.title}
        muted={s.muted}
        onToggleMute={s.toggleMute}
        team={activeTeam}
        rank={s.isRankPhase ? s.activeRank : null}
      />

      <main className="relative z-10 my-auto flex flex-1 flex-col justify-center py-2">
        {activeTeam && s.isRankPhase && <TeamRankBanner team={activeTeam} standing={s.activeTeamStanding} rank={s.activeRank} />}

        {state.phase === "lobby" && <LobbyView team={activeTeam} playerCount={typeof state.players === "number" ? state.players : 0} />}
        {state.phase === "question" && <PlayerQuestion state={state} sessionId={id || ""} onRefresh={s.refresh} />}
        {state.phase === "reveal" && <PlayerReveal state={state} />}
        {state.phase === "leaderboard" && <PlayerLeaderboard state={state} />}
        {state.phase === "ended" && (
          <div className="flex w-full flex-1 flex-col justify-between gap-4">
            {state.team_mode && teamBoard.length > 0 && <TeamBoard teams={teamBoard} myTeam={activeTeam} />}
            <PlayerEnded state={state} />
          </div>
        )}
      </main>
    </PlayerScreen>
  );
}
