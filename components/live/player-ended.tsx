"use client";

import Link from "next/link";
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
  const { before, after, first_egg, overflow } = summary;
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
  if (after.stage === "adult" && after.level > before.level) {
    return after.nextAt === null
      ? `มังกรอัปเลเวลเป็นเลเวล ${after.level} (โตเต็มที่แล้ว)!`
      : `มังกรอัปเลเวลเป็นเลเวล ${after.level}!`;
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
        <Badge className="border-transparent bg-success-soft font-bold text-success">จบการแข่งขัน</Badge>
        <h2 className="pt-2 text-2xl font-black text-foreground sm:text-4xl">สรุปผลการแข่งขัน</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          ควิซสด {total} ข้อ · ผู้เข้าแข่งขันทั้งหมด {playerCount} คน
        </p>
      </div>

      <div className="my-auto space-y-4 py-6">
        <Card
          className={cn(
            "gap-0 border-2 p-6 shadow-lg sm:p-8",
            isPodium && "border-amber-accent/40 bg-amber-accent-soft/40 ring-4 ring-amber-accent-soft",
          )}
        >
          <div className="mb-3 text-5xl sm:text-6xl" aria-hidden>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🎯"}
          </div>

          <span className="block text-xs font-semibold text-muted-foreground sm:text-sm">อันดับสุดท้าย</span>
          <div className="mt-1 mb-2 text-4xl font-black text-foreground sm:text-5xl">
            {rank ? `ที่ ${rank}` : "—"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">จาก {playerCount} คน</span>
          </div>

          <Separator className="my-4" />
          <span className="mb-1 block text-xs text-muted-foreground">คะแนนรวมทั้งหมด</span>
          <span className="font-mono text-3xl font-black text-amber-accent tabular-nums sm:text-4xl">
            {(me.totalScore || 0).toLocaleString()} <span className="text-base font-normal text-muted-foreground">คะแนน</span>
          </span>
        </Card>

        {dragonSummary && (
          <Card className="gap-2 border p-4 text-center shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="secondary">
                +{dragonSummary.points.toLocaleString("th-TH")} แต้มมังกร
              </Badge>
              {dragonSummary.after && (
                <Badge variant="outline">
                  {formatDragonGrowthThai(dragonSummary.after)}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {describeDragonChange(dragonSummary)}
            </p>
            <div>
              <Button asChild variant="link" size="sm">
                <Link href="/s/dragon">ดูมังกรของฉัน</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="pt-4">
        <Button asChild size="lg" className="w-full text-base font-bold shadow-md">
          <Link href="/s/live/quiz">กลับหน้าหลักควิซสด</Link>
        </Button>
      </div>
    </div>
  );
}
