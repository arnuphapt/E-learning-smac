"use client";

import { useId } from "react";
import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PodiumDragonInfo } from "@/lib/podium-dragons";
import type { PodiumEntryGroup } from "@/lib/dragon/podium-renderer.mjs";
import { PodiumDragon } from "./podium-dragon";
import { getTeamStyle } from "./team-colors";

interface LeaderboardPlayer {
  userId?: string;
  name: string;
  score?: number;
  rank?: number;
  dragon?: PodiumDragonInfo | null;
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

// Podium tiers: solid gold / silver / bronze fills with Dragon Base rim; dark panels for name/score plates.
const PODIUM = {
  1: {
    label: "border-[var(--rim)] bg-amber-400 text-amber-950",
    name: "line-clamp-2 mt-1 max-w-40 text-base font-black break-words text-[var(--text)] sm:max-w-56 sm:text-xl lg:text-2xl",
    score: "text-sm font-black text-[var(--gold)] sm:text-lg lg:text-xl",
    step: "h-[clamp(96px,17.5vh,220px)] rounded-t-[var(--radius-lg)] border-[var(--rim)] bg-amber-400 shadow-lg",
    rank: "text-5xl text-amber-950 sm:text-7xl lg:text-8xl",
  },
  2: {
    label: "border-[var(--rim)] bg-slate-200 text-slate-900",
    name: "line-clamp-2 mt-1 max-w-36 text-sm font-bold break-words text-[var(--text)] sm:max-w-44 sm:text-lg lg:text-xl",
    score: "text-xs font-bold text-[var(--text-strong)] sm:text-base lg:text-lg",
    step: "h-[clamp(76px,13.5vh,170px)] rounded-t-[var(--radius-md)] border-[var(--rim)] bg-slate-200 shadow-md",
    rank: "text-4xl text-slate-900 sm:text-5xl lg:text-6xl",
  },
  3: {
    label: "border-[var(--rim)] bg-orange-300 text-orange-950",
    name: "line-clamp-2 mt-1 max-w-36 text-sm font-bold break-words text-[var(--text)] sm:max-w-44 sm:text-lg lg:text-xl",
    score: "text-xs font-bold text-[var(--text-strong)] sm:text-base lg:text-lg",
    step: "h-[clamp(60px,10.5vh,132px)] rounded-t-[var(--radius-md)] border-[var(--rim)] bg-orange-300 shadow-md",
    rank: "text-3xl text-orange-950 sm:text-4xl lg:text-5xl",
  },
} as const;

function PodiumPlace({
  place,
  player,
  entryGroup,
}: {
  place: 1 | 2 | 3;
  player: LeaderboardPlayer;
  entryGroup?: PodiumEntryGroup;
}) {
  const t = PODIUM[place];
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center", place === 1 && "z-10")}>
      <div className="db-panel mb-1.5 w-full max-w-56 px-3 py-2 text-center">
        <span className={cn("inline-block rounded-[var(--radius-sm)] border-2 px-3 py-0.5 text-xs font-bold sm:text-sm", t.label)}>
          อันดับ {place}
        </span>
        <div title={player.name} className={t.name}>
          {player.name}
        </div>
        <div className={cn("font-mono tabular-nums", t.score)}>{(player.score || 0).toLocaleString()} คะแนน</div>
      </div>
      {player.dragon && (
        <PodiumDragon
          speciesId={player.dragon.species_id}
          stage={player.dragon.growth.stage}
          place={place}
          entryGroup={entryGroup}
        />
      )}
      <div className={cn("flex w-full items-center justify-center border-[3px] border-b-0", t.step)}>
        <span className={cn("font-mono font-black tabular-nums", t.rank)}>{player.rank ?? place}</span>
      </div>
    </div>
  );
}

function ScoreText({ value }: { value?: number }) {
  return (
    <span className="shrink-0 font-mono text-sm font-bold text-[var(--gold)] tabular-nums">
      {(value || 0).toLocaleString()} <span className="text-xs font-normal text-[var(--text)]/80">คะแนน</span>
    </span>
  );
}

export function HostEnded({ state }: { state: HostEndedState }) {
  const { top3 = [], top5 = [], total, playerCount } = state;
  const [first, second, third] = top3;
  const podiumId = useId();
  const expectedAdults = [first, second, third].filter(
    (p) => p?.dragon?.growth.stage === "adult",
  ).length;
  const entryGroup: PodiumEntryGroup | undefined =
    expectedAdults > 0 ? { id: `${state.id}:${podiumId}`, expectedAdults } : undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-between overflow-x-clip py-1">
      <div className="flex flex-col items-center gap-1 text-center">
        <Badge className="db-chip border-[var(--accept)] bg-[var(--accept)] px-4 py-1 text-sm font-bold text-[var(--text)]">
          จบการแข่งขันแล้ว
        </Badge>
        <h2 className="db-world-label text-2xl font-black tracking-wide text-[var(--text)] sm:text-4xl lg:text-5xl">แท่นรับรางวัล</h2>
        <p className="db-world-label text-xs text-[var(--text)] sm:text-sm">
          ควิซสด {total} ข้อ · ผู้เข้าแข่งขันทั้งหมด {playerCount} คน
        </p>
      </div>

      <div className="mx-auto my-1 flex w-full max-w-3xl items-end justify-center gap-3 px-4 sm:my-2 sm:gap-6">
        {second && <PodiumPlace place={2} player={second} entryGroup={entryGroup} />}
        {first && <PodiumPlace place={1} player={first} entryGroup={entryGroup} />}
        {third && <PodiumPlace place={3} player={third} entryGroup={entryGroup} />}
      </div>

      {state.team_mode && state.teamBoard ? (
        <div className="mx-auto my-6 grid w-full max-w-5xl grid-cols-1 items-start gap-6 px-4 lg:grid-cols-2">
          <Card className="db-panel gap-3 p-5">
            <h3 className="text-lg font-bold text-[var(--text-strong)]">คะแนนเดี่ยว (Top 5)</h3>
            <div className="flex flex-col gap-2.5">
              {top5.map((p, idx) => (
                <div key={p.userId || idx} className="db-row flex items-center justify-between p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--frame-soft)] bg-[var(--surface-well)] text-xs font-bold text-[var(--text)] tabular-nums">
                      {p.rank ?? idx + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-[var(--text)] sm:text-base">{p.name}</span>
                  </div>
                  <ScoreText value={p.score} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="db-panel gap-3 p-5">
            <h3 className="flex items-center justify-between text-lg font-bold text-[var(--text-strong)]">
              <span>ตารางคะแนนทีม</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">คะแนนเฉลี่ยสมาชิก</span>
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
                      "db-row flex items-center justify-between p-3",
                      isWinner && "border-2 border-[var(--gold)] bg-[var(--surface-1)]",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums",
                          isWinner
                            ? "bg-amber-400 text-amber-950"
                            : "border border-[var(--frame-soft)] bg-[var(--surface-well)] text-[var(--text)]",
                        )}
                      >
                        {rank}
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <span aria-hidden className={cn("size-3 shrink-0 rounded-full", style.dot)} />
                        <span className="truncate text-sm font-bold text-[var(--text)] sm:text-base">
                          ทีม{team.name}
                        </span>
                        {isWinner && (
                          <Badge className="shrink-0 border-amber-500/30 bg-amber-400 text-amber-950">
                            <CrownIcon aria-hidden />
                            ทีมชนะเลิศ
                          </Badge>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text)]/80">({team.members} คน)</span>
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
          <Card className="db-panel mx-auto mt-2 w-full max-w-xl gap-2 p-4">
            <div className="text-xs font-semibold text-[var(--text-muted)]">อันดับ 4 - 5</div>
            <div className="flex flex-col gap-2">
              {top5.slice(3, 5).map((p, idx) => (
                <div key={p.userId || idx} className="db-row flex items-center justify-between px-3 py-2 text-sm sm:text-base">
                  <span className="font-semibold text-[var(--text)] tabular-nums">
                    {p.rank ?? idx + 4}. {p.name}
                  </span>
                  <ScoreText value={p.score} />
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      <div className="flex items-center justify-center gap-4 pt-2">
        <Button asChild variant="outline" size="lg" className="db-btn db-btn--default h-auto px-6 py-3 text-base font-bold">
          <Link href="/i/live/hubs">กลับหน้ารายการห้อง</Link>
        </Button>
        <Button asChild size="lg" className="db-btn db-btn--accept h-auto px-8 py-3 text-[19px] font-bold">
          <Link href={`/i/live/${state.id}/results`}>ดูรายงานผลคะแนน</Link>
        </Button>
      </div>
    </div>
  );
}
