"use client";

import Link from "next/link";
import { AwardIcon, MedalIcon, TargetIcon, TrophyIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatDragonGrowthThai,
  type DragonGrantSummary,
} from "@/lib/dragon-growth";
import { cn } from "@/lib/utils";

export interface PlayerEndedState {
  me?: {
    rank?: number | null;
    totalScore?: number;
    dragon_summary?: DragonGrantSummary | null;
  };
  playerCount: number;
  total: number;
}

function describeDragonChange(summary: DragonGrantSummary): string {
  const { before, after, first_egg, overflow, message } = summary;
  if (message) {
    return message;
  }
  if (!before || !after) {
    return overflow > 0
      ? `มังกรโตเต็มที่แล้ว (ส่วนเกิน ${overflow.toLocaleString("th-TH")} แต้มเข้ากระเป๋า)`
      : `ได้รับ ${summary.points.toLocaleString("th-TH")} แต้มมังกร`;
  }
  if (first_egg && after.stage === "egg") {
    return "ได้รับไข่มังกรใบแรกแล้ว!";
  }
  if (first_egg) {
    return `ได้รับมังกรตัวแรกและเติบโตเป็น${formatDragonGrowthThai(after)}!`;
  }
  if (before.stage === "egg" && after.stage !== "egg") {
    return after.stage === "adult"
      ? "ไข่มังกรฟักและโตเป็นตัวเต็มวัยแล้ว!"
      : "ไข่มังกรฟักเป็นลูกมังกรแล้ว!";
  }
  if (before.stage === "baby" && after.stage === "adult") {
    return "มังกรโตเป็นตัวเต็มวัยแล้ว!";
  }
  if (overflow > 0) {
    return `มังกรโตเต็มที่แล้ว (ส่วนเกิน ${overflow.toLocaleString("th-TH")} แต้มเข้ากระเป๋า)`;
  }
  if (after.nextAt === null) {
    return "มังกรโตเต็มที่แล้ว";
  }
  return `อีก ${after.toNext.toLocaleString("th-TH")} แต้มถึงขั้นถัดไป`;
}

export function PlayerEnded({ state }: { state: PlayerEndedState }) {
  const { me = {}, playerCount, total } = state;
  const rank = me.rank;
  const isPodium = !!rank && rank <= 3;
  const dragonSummary = me.dragon_summary ?? null;

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col justify-between py-4 text-center sm:py-6">
      <div className="flex flex-col items-center gap-1">
        <Badge className="db-chip border-[var(--accept)] bg-[var(--accept)] px-4 py-1 text-sm font-bold text-[var(--text)]">จบการแข่งขัน</Badge>
        <h2 className="db-world-label pt-2 text-2xl font-black text-[var(--text)] sm:text-4xl">สรุปผลการแข่งขัน</h2>
        <p className="db-world-label text-xs text-[var(--text)] sm:text-sm">
          ควิซสด {total} ข้อ · ผู้เข้าแข่งขันทั้งหมด {playerCount} คน
        </p>
      </div>

      <div className="my-auto space-y-4 py-6">
        <Card
          className={cn(
            "db-panel gap-0 p-6 sm:p-8",
            isPodium && "border-t-[var(--gold)] border-b-[var(--gold)]",
          )}
        >
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-[var(--frame-soft)] bg-[var(--surface-1)]" aria-hidden>
            {rank === 1 ? (
              <TrophyIcon className="size-8 text-[var(--gold)]" />
            ) : rank === 2 ? (
              <MedalIcon className="size-8 text-slate-200" />
            ) : rank === 3 ? (
              <AwardIcon className="size-8 text-orange-300" />
            ) : (
              <TargetIcon className="size-8 text-[var(--text-subtle)]" />
            )}
          </div>

          <span className="block text-xs font-semibold text-[var(--text-muted)] sm:text-sm">อันดับสุดท้าย</span>
          <div className="mt-1 mb-2 font-mono text-4xl font-black text-[var(--text)] tabular-nums sm:text-5xl">
            {rank ? `ที่ ${rank}` : "—"}
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">จาก {playerCount} คน</span>
          </div>

          <Separator className="my-4 bg-[var(--frame-soft)]" />
          <span className="mb-1 block text-xs text-[var(--text-muted)]">คะแนนรวมทั้งหมด</span>
          <span className="font-mono text-3xl font-black text-[var(--gold)] tabular-nums sm:text-4xl">
            {(me.totalScore || 0).toLocaleString()} <span className="text-base font-normal text-[var(--text-muted)]">คะแนน</span>
          </span>
        </Card>

        {dragonSummary && (
          <Card className="db-panel gap-3 p-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="secondary" className="db-chip border-[var(--gold)]/60 bg-[var(--surface-1)] px-3 py-1 text-xs font-bold text-[var(--gold)] tabular-nums">
                +{dragonSummary.points.toLocaleString("th-TH")} แต้มมังกร
              </Badge>
              {dragonSummary.after && (
                <Badge variant="outline" className="db-chip px-3 py-1 text-xs font-semibold text-[var(--text-strong)]">
                  {formatDragonGrowthThai(dragonSummary.after)}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-[var(--text)]">
              {describeDragonChange(dragonSummary)}
            </p>
            <div>
              <Button asChild size="sm" className="db-btn db-btn--accept h-auto px-5 py-2 text-sm font-bold sm:text-base">
                <Link href="/s/dragon">ดูมังกรของฉัน</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="pt-4">
        <Button asChild size="lg" className="db-btn db-btn--default h-auto w-full py-3 text-base font-bold">
          <Link href="/s/live/quiz">กลับหน้าหลักควิซสด</Link>
        </Button>
      </div>
    </div>
  );
}
