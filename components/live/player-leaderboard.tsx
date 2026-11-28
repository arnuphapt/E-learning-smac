"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { rankMedalClass } from "./rank-medal";

interface LeaderboardPlayer {
  userId?: string;
  name: string;
  score?: number;
  rank?: number;
}

export interface PlayerLeaderboardState {
  me?: {
    userId?: string;
    rank?: number | null;
    totalScore?: number;
  };
  top5?: LeaderboardPlayer[];
  index: number;
  total: number;
  playerCount?: number;
}

export function PlayerLeaderboard({ state }: { state: PlayerLeaderboardState }) {
  const { me = {}, top5 = [], index, total, playerCount } = state;
  const isLast = index + 1 >= total;

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col justify-between py-2 sm:py-4">
      <div className="db-panel flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-sm font-bold text-[var(--text)] tabular-nums">
          ตารางคะแนน (ข้อ {index + 1}/{total})
        </span>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">{playerCount} ผู้เข้าแข่งขัน</span>
      </div>

      <Card className="db-panel my-3 flex-row items-center justify-between gap-0 border-t-[var(--accept)] border-b-[var(--accept)] p-4">
        <div>
          <span className="block text-xs font-semibold text-[var(--text-subtle)]">อันดับของคุณ</span>
          <div className="font-mono text-2xl font-black text-[var(--text)] tabular-nums sm:text-3xl">
            {me.rank ? `ที่ ${me.rank}` : "—"}
            <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">จาก {playerCount || "—"} คน</span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-xs text-[var(--text-muted)]">คะแนนสะสม</span>
          <span className="font-mono text-xl font-black text-[var(--gold)] tabular-nums sm:text-2xl">
            {(me.totalScore || 0).toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">คะแนน</span>
          </span>
        </div>
      </Card>

      <div className="db-panel my-2 flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        <div className="mb-1 px-1 text-xs font-semibold text-[var(--text-muted)]">ผู้นำ 5 อันดับแรก (Top 5)</div>

        {top5.map((p, idx) => {
          const isMe = p.userId === me.userId;
          return (
            <Card
              key={p.userId || idx}
              className={cn(
                "db-row flex-row items-center justify-between gap-0 p-3",
                isMe && "border-2 border-[var(--accept)] bg-[var(--surface-1)]",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold tabular-nums",
                    rankMedalClass(p.rank),
                  )}
                >
                  {p.rank}
                </div>
                <span className="block truncate text-sm font-bold text-[var(--text)] sm:text-base">
                  {p.name} {isMe && <span className="text-xs font-bold text-[var(--gold)]">(คุณ)</span>}
                </span>
              </div>
              <div className="ml-2 shrink-0 font-mono text-sm font-bold text-[var(--gold)] tabular-nums sm:text-base">
                {(p.score || 0).toLocaleString()}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="db-world-label py-2 text-center text-xs text-[var(--text)]">
        {isLast ? "รอผู้สอนสรุปผลการแข่งขัน…" : "รอผู้สอนเปิดข้อถัดไป…"}
      </p>
    </div>
  );
}
