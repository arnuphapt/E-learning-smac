"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      <div className="flex items-center justify-between px-2 pb-3">
        <span className="text-sm font-semibold text-muted-foreground">
          ผลลัพธ์ข้อที่ {index + 1} จาก {total}
        </span>
        <Badge variant="secondary">เฉลยแล้ว</Badge>
      </div>
      <Separator />

      <div className="my-auto py-4">
        <Card
          className={cn(
            "gap-0 border-2 p-6 text-center shadow-md sm:p-8",
            isCorrect && "border-success/40 bg-success-soft text-success",
            !isCorrect && hasAnswered && "border-destructive/40 bg-destructive/10 text-destructive",
            !isCorrect && !hasAnswered && "text-muted-foreground",
          )}
        >
          <div
            className={cn(
              "mx-auto mb-4 flex size-16 items-center justify-center rounded-full text-3xl shadow-sm sm:size-20 sm:text-4xl",
              isCorrect && "bg-success text-white ring-4 ring-success/20",
              !isCorrect && hasAnswered && "bg-destructive text-white ring-4 ring-destructive/20",
              !isCorrect && !hasAnswered && "border bg-muted text-muted-foreground",
            )}
            aria-hidden
          >
            {isCorrect ? "✓" : hasAnswered ? "✕" : "—"}
          </div>

          <h2 className="mb-1 text-2xl font-black sm:text-3xl">
            {isCorrect ? "ถูกต้อง!" : hasAnswered ? "ตอบผิด" : "ไม่ได้ส่งคำตอบ"}
          </h2>

          <div
            className={cn(
              "mx-auto mt-2 w-fit rounded-full border bg-card px-4 py-1.5 font-mono text-base font-bold shadow-xs sm:text-lg",
              isCorrect && "border-success/30 text-success",
              !isCorrect && hasAnswered && "border-destructive/30 text-destructive",
              !isCorrect && !hasAnswered && "text-muted-foreground",
            )}
          >
            +{points.toLocaleString()} คะแนน
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="gap-0 p-4 text-center">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">คะแนนรวม</span>
            <span className="font-mono text-2xl font-black text-primary tabular-nums sm:text-3xl">
              {totalScore.toLocaleString()}
            </span>
          </Card>

          <Card className="gap-0 p-4 text-center">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">อันดับปัจจุบัน</span>
            <span className="font-mono text-2xl font-black text-foreground tabular-nums sm:text-3xl">
              {rank ? `ที่ ${rank}` : "—"}
            </span>
            {playerCount ? <span className="mt-0.5 block text-xs text-muted-foreground">จาก {playerCount} คน</span> : null}
          </Card>
        </div>
      </div>

      <Separator />
      <p className="py-2 text-center text-xs text-muted-foreground motion-safe:animate-pulse">
        รอผู้สอนเปิดตารางคะแนนหรือข้อถัดไป…
      </p>
    </div>
  );
}
