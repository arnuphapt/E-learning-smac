"use client";

import { useEffect, useRef } from "react";
import * as sound from "@/lib/live-sound";

export function PlayerReveal({ state }) {
  const { me = {}, index, total, playerCount } = state;
  const isCorrect = !!me.correct;
  const hasAnswered = !!me.answered;
  const points = me.points || 0;
  const totalScore = me.totalScore || 0;
  const rank = me.rank;

  const playedIndexRef = useRef(null);

  // SFX: correct/wrong at reveal (guarded by question index, plays once per reveal)
  useEffect(() => {
    if (playedIndexRef.current === index) return;
    playedIndexRef.current = index;

    if (isCorrect) {
      sound.play("correct");
    } else {
      sound.play("wrong");
    }
  }, [index, isCorrect]);

  return (
    <div className="flex-1 flex flex-col justify-between w-full h-full max-w-lg mx-auto py-2 sm:py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between px-2 pb-3 border-b border-border">
        <span className="text-sm font-semibold text-muted-foreground">
          ผลลัพธ์ข้อที่ {index + 1} จาก {total}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
          เฉลยแล้ว
        </span>
      </div>

      {/* Result Billboard Card */}
      <div className="my-auto py-4">
        <div
          className={`p-6 sm:p-8 rounded-[24px] border-2 shadow-md text-center transition-all ${
            isCorrect
              ? "bg-[#e2f0e6] border-[#1f7a4d]/40 text-[#1f7a4d]"
              : hasAnswered
              ? "bg-[#f7e2e2] border-[#b43444]/40 text-[#b43444]"
              : "bg-card border-border text-muted-foreground"
          }`}
        >
          {/* Status Icon */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto flex items-center justify-center text-3xl sm:text-4xl shadow-sm mb-4 ${
              isCorrect
                ? "bg-[#1f7a4d] text-white ring-4 ring-[#1f7a4d]/20"
                : hasAnswered
                ? "bg-[#b43444] text-white ring-4 ring-[#b43444]/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isCorrect ? "✓" : hasAnswered ? "✕" : "—"}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-1">
            {isCorrect ? "ถูกต้อง!" : hasAnswered ? "ตอบผิด" : "ไม่ได้ส่งคำตอบ"}
          </h2>

          <div
            className={`inline-block px-4 py-1.5 rounded-full text-base sm:text-lg font-mono font-bold mt-2 ${
              isCorrect
                ? "bg-white/90 text-[#1f7a4d] border border-[#1f7a4d]/30 shadow-xs"
                : hasAnswered
                ? "bg-white/90 text-[#b43444] border border-[#b43444]/30 shadow-xs"
                : "bg-card text-muted-foreground border border-border"
            }`}
          >
            +{points.toLocaleString()} คะแนน
          </div>
        </div>

        {/* Total Score & Rank Wells */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
          <div className="p-4 rounded-[20px] bg-card border border-border text-center shadow-xs">
            <span className="text-xs text-muted-foreground block mb-1 font-medium">คะแนนรวม</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-primary tabular-nums">
              {totalScore.toLocaleString()}
            </span>
          </div>

          <div className="p-4 rounded-[20px] bg-card border border-border text-center shadow-xs">
            <span className="text-xs text-muted-foreground block mb-1 font-medium">อันดับปัจจุบัน</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-foreground tabular-nums">
              {rank ? `ที่ ${rank}` : "—"}
            </span>
            {playerCount && (
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                จาก {playerCount} คน
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer prompt */}
      <div className="text-center py-2 border-t border-border">
        <p className="text-xs text-muted-foreground animate-pulse">
          รอผู้สอนเปิดตารางคะแนนหรือข้อถัดไป…
        </p>
      </div>
    </div>
  );
}
