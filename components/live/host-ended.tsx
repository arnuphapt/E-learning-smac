"use client";

import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTeamStyle } from "./team-colors";

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

export interface HostEndedState {
  id: string;
  top3?: LeaderboardPlayer[];
  top5?: LeaderboardPlayer[];
  total: number;
  playerCount: number;
  team_mode?: boolean;
  teamBoard?: TeamBoardEntry[];
}

// Podium tiers: fixed gold / silver / bronze colours (game-show identity, not theme tokens).
const PODIUM = {
  1: {
    label: "bg-amber-400 border-amber-500/40 text-amber-950",
    name: "line-clamp-2 mt-1 max-w-40 text-xl font-black break-words text-foreground sm:max-w-56 sm:text-3xl",
    score: "text-base font-black text-amber-800 sm:text-2xl",
    step: "h-48 rounded-t-3xl border-amber-400/80 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 shadow-lg ring-4 ring-amber-400/20 sm:h-64",
    rank: "text-5xl text-amber-950 sm:text-8xl",
  },
  2: {
    label: "bg-slate-200 border-slate-300 text-slate-800",
    name: "line-clamp-2 mt-1 max-w-36 text-lg font-bold break-words text-foreground sm:max-w-44 sm:text-2xl",
    score: "text-sm font-bold text-slate-700 sm:text-lg",
    step: "h-36 rounded-t-2xl border-slate-300 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 shadow-md sm:h-48",
    rank: "text-4xl text-slate-800 sm:text-6xl",
  },
  3: {
    label: "bg-orange-700 border-orange-800 text-white",
    name: "line-clamp-2 mt-1 max-w-36 text-lg font-bold break-words text-foreground sm:max-w-44 sm:text-2xl",
    score: "text-sm font-bold text-orange-800 sm:text-lg",
    step: "h-28 rounded-t-2xl border-orange-300 bg-gradient-to-b from-orange-100 via-orange-200 to-orange-300 shadow-md sm:h-36",
    rank: "text-4xl text-orange-950 sm:text-5xl",
  },
} as const;

function PodiumPlace({ place, player }: { place: 1 | 2 | 3; player: LeaderboardPlayer }) {
  const t = PODIUM[place];
  return (
    <div className={cn("flex flex-1 flex-col items-center", place === 1 && "z-10")}>
      <div className="mb-3 text-center">
        <span className={cn("rounded-full border px-3 py-1 text-xs font-bold shadow-xs sm:text-sm", t.label)}>อันดับ {place}</span>
        <div title={player.name} className={t.name}>
          {player.name}
        </div>
        <div className={cn("font-mono tabular-nums", t.score)}>{(player.score || 0).toLocaleString()} คะแนน</div>
      </div>
      <div className={cn("flex w-full items-center justify-center border-2 border-b-0", t.step)}>
        <span className={cn("font-black", t.rank)}>{player.rank ?? place}</span>
      </div>
    </div>
  );
}

function ScoreText({ value }: { value?: number }) {
  return (
    <span className="shrink-0 font-mono text-sm font-bold text-primary tabular-nums">
      {(value || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">คะแนน</span>
    </span>
  );
}

export function HostEnded({ state }: { state: HostEndedState }) {
  const { top3 = [], top5 = [], total, playerCount } = state;
  const [first, second, third] = top3;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-between py-4 sm:py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <Badge className="border-transparent bg-success-soft px-4 py-1.5 text-sm font-bold text-success">จบการแข่งขันแล้ว</Badge>
        <h2 className="text-3xl font-black tracking-wide text-foreground sm:text-6xl">แท่นรับรางวัล</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          ควิซสด {total} ข้อ · ผู้เข้าแข่งขันทั้งหมด {playerCount} คน
        </p>
      </div>

      <div className="mx-auto my-8 flex w-full max-w-3xl items-end justify-center gap-3 px-4 sm:gap-6">
        {second && <PodiumPlace place={2} player={second} />}
        {first && <PodiumPlace place={1} player={first} />}
        {third && <PodiumPlace place={3} player={third} />}
      </div>

      {state.team_mode && state.teamBoard ? (
        <div className="mx-auto my-6 grid w-full max-w-5xl grid-cols-1 items-start gap-6 px-4 lg:grid-cols-2">
          <Card className="gap-3 p-5">
            <h3 className="text-lg font-bold text-foreground">คะแนนเดี่ยว (Top 5)</h3>
            <div className="flex flex-col gap-2.5">
              {top5.map((p, idx) => (
                <div key={p.userId || idx} className="flex items-center justify-between rounded-lg border bg-muted/50 p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-bold text-foreground">
                      {p.rank ?? idx + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground sm:text-base">{p.name}</span>
                  </div>
                  <ScoreText value={p.score} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="gap-3 p-5">
            <h3 className="flex items-center justify-between text-lg font-bold text-foreground">
              <span>ตารางคะแนนทีม</span>
              <span className="text-xs font-normal text-muted-foreground">คะแนนเฉลี่ยสมาชิก</span>
            </h3>
            <div className="flex flex-col gap-2.5">
              {state.teamBoard.map((team, idx) => {
                const rank = team.rank ?? idx + 1;
                const isWinner = rank === 1;
                const style = getTeamStyle(team.colorNo);
                return (
                  <div
                    key={team.id || idx}
                    className={cn(
                      "flex items-center justify-between rounded-xl p-3",
                      isWinner ? "border-2 border-amber-400 bg-amber-50 shadow-sm" : "border bg-muted/50",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                          isWinner ? "bg-amber-400 text-amber-950" : "border bg-card text-foreground",
                        )}
                      >
                        {rank}
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <span aria-hidden className={cn("size-3 shrink-0 rounded-full", style.dot)} />
                        <span className={cn("truncate text-sm font-bold sm:text-base", isWinner ? "text-amber-950" : "text-foreground")}>
                          ทีม{team.name}
                        </span>
                        {isWinner && (
                          <Badge className="shrink-0 border-amber-500/30 bg-amber-400 text-amber-950">
                            <CrownIcon aria-hidden />
                            ทีมชนะเลิศ
                          </Badge>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">({team.members} คน)</span>
                    </div>
                    <ScoreText value={team.score} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        top5.length > 3 && (
          <Card className="mx-auto mt-2 w-full max-w-xl gap-2 p-4">
            <div className="text-xs font-semibold text-muted-foreground">อันดับ 4 - 5</div>
            <div className="flex flex-col gap-2">
              {top5.slice(3, 5).map((p, idx) => (
                <div key={p.userId || idx} className="flex items-center justify-between text-sm sm:text-base">
                  <span className="font-medium text-foreground">
                    {p.rank ?? idx + 4}. {p.name}
                  </span>
                  <ScoreText value={p.score} />
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      <div className="flex items-center justify-center gap-4 pt-4">
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/i/live">กลับหน้ารายการห้อง</Link>
        </Button>
        <Button asChild size="lg" className="rounded-full px-8 shadow-md">
          <Link href={`/i/live/${state.id}/results`}>ดูรายงานผลคะแนน</Link>
        </Button>
      </div>
    </div>
  );
}
