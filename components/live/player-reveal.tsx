"use client";

import { useEffect, useRef } from "react";
import { CheckIcon, MinusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import * as sound from "@/lib/live-sound";

export interface PlayerRevealState {
  me?: {
    correct?: boolean;
    answered?: boolean;
    points?: number;
    totalScore?: number;
    rank?: number | null;
  };
  index: number;
  total: number;
  playerCount?: number;
}

export function PlayerReveal({ state }: { state: PlayerRevealState }) {
  const { me = {}, index, total, playerCount } = state;
  const isCorrect = !!me.correct;
  const hasAnswered = !!me.answered;
  const points = me.points || 0;
  const totalScore = me.totalScore || 0;
  const rank = me.rank;

  const playedIndexRef = useRef<number | null>(null);

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
    <div className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col justify-between py-2 sm:py-4">
      <div className="db-panel flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-sm font-bold text-[var(--text-strong)] tabular-nums">
          ผลลัพธ์ข้อที่ {index + 1} จาก {total}
        </span>
        <Badge variant="secondary" className="db-chip px-2.5 py-0.5 text-xs font-semibold">เฉลยแล้ว</Badge>
      </div>

      <div className="my-auto py-4">
        <Card
          className={cn(
            "db-panel gap-0 p-6 text-center sm:p-8",
            isCorrect && "border-t-[var(--accept)] border-b-[var(--accept)]",
            !isCorrect && hasAnswered && "border-t-[var(--cancel-ink)] border-b-[var(--cancel-ink)]",
          )}
        >
          <div
            className={cn(
              "mx-auto mb-4 flex size-16 items-center justify-center rounded-full shadow-sm sm:size-20",
              isCorrect && "bg-[var(--accept)] text-[var(--text)] ring-4 ring-[var(--accept)]/25",
              !isCorrect && hasAnswered && "bg-[var(--cancel-ink)] text-[var(--text)] ring-4 ring-[var(--cancel-ink)]/25",
              !isCorrect && !hasAnswered && "border border-[var(--frame-soft)] bg-[var(--surface-1)] text-[var(--text-muted)]",
            )}
            aria-hidden
          >
            {isCorrect ? <CheckIcon className="size-9" /> : hasAnswered ? <XIcon className="size-9" /> : <MinusIcon className="size-8" />}
          </div>

          <h2 className="mb-1 text-2xl font-black text-[var(--text)] sm:text-3xl">
            {isCorrect ? "ถูกต้อง!" : hasAnswered ? "ตอบผิด" : "ไม่ได้ส่งคำตอบ"}
          </h2>

          <div
            className={cn(
              "db-chip mx-auto mt-2 w-fit px-4 py-1.5 font-mono text-base font-bold tabular-nums sm:text-lg",
              isCorrect && "border-[var(--accept)] text-[var(--gold)]",
              !isCorrect && hasAnswered && "border-[var(--cancel-ink)] text-[var(--warn)]",
              !isCorrect && !hasAnswered && "text-[var(--text-muted)]",
            )}
          >
            +{points.toLocaleString()} คะแนน
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="db-panel gap-0 p-4 text-center">
            <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">คะแนนรวม</span>
            <span className="font-mono text-2xl font-black text-[var(--gold)] tabular-nums sm:text-3xl">
              {totalScore.toLocaleString()}
            </span>
          </Card>

          <Card className="db-panel gap-0 p-4 text-center">
            <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">อันดับปัจจุบัน</span>
            <span className="font-mono text-2xl font-black text-[var(--text)] tabular-nums sm:text-3xl">
              {rank ? `ที่ ${rank}` : "—"}
            </span>
            {playerCount ? <span className="mt-0.5 block text-xs text-[var(--text-muted)] tabular-nums">จาก {playerCount} คน</span> : null}
          </Card>
        </div>
      </div>

      <p className="db-world-label py-2 text-center text-xs text-[var(--text)]">
        รอผู้สอนเปิดตารางคะแนนหรือข้อถัดไป…
      </p>
    </div>
  );
}
