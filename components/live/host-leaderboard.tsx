"use client";

import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTeamStyle } from "./team-colors";
import { rankMedalClass } from "./rank-medal";

interface LeaderboardPlayer {
  userId?: string;
  name: string;
  score?: number;
  rank?: number;
}

interface TeamBoardEntry {
  id?: string;
  name: string;
  colorNo: number;
  members: number;
  score?: number;
  rank?: number;
}

export interface HostLeaderboardState {
  top5?: LeaderboardPlayer[];
  index: number;
  total: number;
  team_mode?: boolean;
  teamBoard?: TeamBoardEntry[];
}

function Score({ value, big }: { value?: number; big?: boolean }) {
  return (
    <div className={cn("shrink-0 font-mono font-black text-primary tabular-nums", big ? "text-xl sm:text-3xl" : "text-lg sm:text-xl")}>
      {(value || 0).toLocaleString()}{" "}
      <span className={cn("font-normal text-muted-foreground", big ? "text-sm sm:text-base" : "text-xs")}>คะแนน</span>
    </div>
  );
}

function EmptyLine({ children, big }: { children: string; big?: boolean }) {
  return <div className={cn("text-center text-muted-foreground", big ? "py-12" : "py-8")}>{children}</div>;
}

export function HostLeaderboard({
  state,
  onAdvance,
  advancing,
}: {
  state: HostLeaderboardState;
  onAdvance: (action: string) => unknown;
  advancing?: boolean;
}) {
  const { top5 = [], index, total, teamBoard } = state;
  const isLast = index + 1 >= total;
  const teamView = !!state.team_mode && !!teamBoard;

  const playerRows = (big: boolean) =>
    top5.length === 0 ? (
      <EmptyLine big={big}>ยังไม่มีข้อมูลคะแนน</EmptyLine>
    ) : (
      top5.map((player, idx) => (
        <Card
          key={player.userId || idx}
          className={cn("flex-row items-center justify-between gap-3", big ? "p-4 sm:p-5" : "p-3.5 sm:p-4")}
        >
          <div className={cn("flex min-w-0 items-center", big ? "gap-4 sm:gap-6" : "gap-3 sm:gap-4")}>
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full border font-black",
                big ? "size-10 text-lg sm:size-12 sm:text-xl" : "size-9 text-base sm:size-10",
                rankMedalClass(player.rank),
              )}
            >
              {player.rank}
            </div>
            <div className={cn("truncate font-bold text-foreground", big ? "text-xl sm:text-2xl" : "text-base sm:text-lg")}>
              {player.name}
            </div>
          </div>
          <Score value={player.score} big={big} />
        </Card>
      ))
    );

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col justify-between py-4 sm:py-6",
        teamView ? "max-w-6xl" : "max-w-4xl",
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <Badge variant="secondary" className="px-4 py-1.5 text-sm font-semibold">
          จบข้อที่ {index + 1} จาก {total}
        </Badge>
        <h2 className="text-3xl font-black tracking-wide text-foreground sm:text-5xl">ตารางผู้นำ (Leaderboard)</h2>
      </div>

      {teamView ? (
        <div className="my-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="mb-2 text-xl font-bold text-foreground">คะแนนเดี่ยว (Top 5)</h3>
            {playerRows(false)}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="mb-2 flex items-center justify-between text-xl font-bold text-foreground">
              <span>ตารางคะแนนทีม</span>
              <span className="text-xs font-normal text-muted-foreground">คะแนนเฉลี่ย</span>
            </h3>
            {teamBoard.length === 0 ? (
              <EmptyLine>ยังไม่มีข้อมูลทีม</EmptyLine>
            ) : (
              teamBoard.map((team, idx) => {
                const style = getTeamStyle(team.colorNo);
                return (
                  <Card key={team.id || idx} className="flex-row items-center justify-between gap-3 p-3.5 sm:p-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-base font-black text-foreground sm:size-10">
                        {team.rank}
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <span aria-hidden className={cn("size-3.5 shrink-0 rounded-full", style.dot)} />
                        <span className="truncate text-base font-bold text-foreground sm:text-lg">ทีม{team.name}</span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">({team.members} คน)</span>
                    </div>
                    <Score value={team.score} />
                  </Card>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="my-6 flex flex-col gap-3">{playerRows(true)}</div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          className="h-auto rounded-full px-8 py-3.5 text-lg font-bold shadow-md sm:text-xl"
          onClick={() => onAdvance(isLast ? "finish" : "next")}
          disabled={advancing}
        >
          {isLast ? "ดูผลรวม" : "ข้อถัดไป"}
          {isLast ? <CheckIcon /> : <ArrowRightIcon />}
        </Button>
      </div>
    </div>
  );
}
