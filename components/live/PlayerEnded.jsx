"use client";

import Link from "next/link";

export function PlayerEnded({ state }) {
  const { me = {}, playerCount, total } = state;
  const rank = me.rank;
  const isPodium = rank && rank <= 3;

  return (
    <div className="flex-1 flex flex-col justify-between w-full h-full max-w-lg mx-auto py-4 sm:py-6 text-center">
      <div className="space-y-1">
        <span className="inline-block px-3 py-1 rounded-full bg-success-soft text-success border border-success/30 text-xs font-bold uppercase tracking-wider">
          จบการแข่งขัน
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-foreground pt-2">
          สรุปผลการแข่งขัน
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          ควิซสด {total} ข้อ · ผู้เข้าแข่งขันทั้งหมด {playerCount} คน
        </p>
      </div>

      {/* Main Final Result Card */}
      <div className="my-auto py-6">
        <div
          className={`p-6 sm:p-8 rounded-2xl card border-2 shadow-lg ${
            isPodium
              ? "border-amber-300 bg-amber-50/40 ring-4 ring-amber-100"
              : "border-border bg-card"
          }`}
        >
          {/* Trophy / Medal icon */}
          <div className="text-5xl sm:text-6xl mb-3">
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🎯"}
          </div>

          <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider block">
            อันดับสุดท้าย
          </span>
          <div className="text-4xl sm:text-5xl font-black text-foreground mt-1 mb-2">
            {rank ? `ที่ ${rank}` : "—"}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              จาก {playerCount} คน
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground block mb-1">คะแนนรวมทั้งหมด</span>
            <span className="text-3xl sm:text-4xl font-black font-mono text-primary tabular-nums">
              {(me.totalScore || 0).toLocaleString()} <span className="text-base font-normal text-muted-foreground">คะแนน</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <Link
          href="/s/live"
          className="btn btn-primary w-full text-base font-bold shadow-md"
          style={{ minHeight: 46 }}
        >
          กลับหน้าหลักควิซสด
        </Link>
      </div>
    </div>
  );
}
