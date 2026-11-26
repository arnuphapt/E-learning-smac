"use client";

import { useEffect, useState, useRef } from "react";
import { CHOICE_STYLES, revealDelayMs } from "@/lib/live";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChoiceIcon } from "./choice-icon";
import { answerTheme } from "./answer-palette";
import * as sound from "@/lib/live-sound";

interface LiveChoice {
  id: string;
  text: string;
}

export interface HostQuestionState {
  question?: {
    text?: string;
    time_limit_sec?: number;
    choices?: LiveChoice[];
  } | null;
  index: number;
  total: number;
  deadline?: string | null;
  now?: string | null;
  /** Client Date.now() when the state response arrived (set by useLiveSession). */
  fetchedAt?: number;
  answeredCount?: number;
  playerCount?: number;
}

interface RevealTracker {
  revealed: boolean;
  inFlight: boolean;
  attempts: number;
}

const REVEAL_RETRY_MS = 400;
const MAX_REVEAL_ATTEMPTS = 8;

export function HostQuestion({
  state,
  onAdvance,
}: {
  state: HostQuestionState;
  onAdvance: (action: string) => Promise<boolean> | boolean;
}) {
  const { question, index, total, deadline, now, fetchedAt, answeredCount = 0, playerCount = 0 } = state;
  const revealRef = useRef<RevealTracker | null>(null);
  const lastHurrySecRef = useRef<number | null>(null);
  const bellIndexRef = useRef<number | null>(null);

  // Compute countdown using deadline and server-now offset
  const [remainingSec, setRemainingSec] = useState(() => {
    if (!deadline) return question?.time_limit_sec || 20;
    const serverOffset = now ? Date.parse(now) - (fetchedAt ?? Date.now()) : 0;
    const currentServerTime = Date.now() + serverOffset;
    return Math.max(0, Math.ceil((Date.parse(deadline) - currentServerTime) / 1000));
  });

  // Reset revealed trigger and hurry sound tracker on new question index
  useEffect(() => {
    revealRef.current = { revealed: false, inFlight: false, attempts: 0 };
    lastHurrySecRef.current = null;
  }, [index]);

  // SFX: hurry once per second in the last 5 seconds (5, 4, 3, 2, 1)
  useEffect(() => {
    if (remainingSec <= 5 && remainingSec > 0) {
      if (lastHurrySecRef.current !== remainingSec) {
        lastHurrySecRef.current = remainingSec;
        sound.play("hurry");
      }
    }
  }, [remainingSec]);

  // Bell once per question when 5s remain (not played if revealed earlier: component unmounts)
  useEffect(() => {
    if (remainingSec <= 5 && remainingSec > 0 && bellIndexRef.current !== index) {
      bellIndexRef.current = index;
      sound.bell();
    }
  }, [remainingSec, index]);

  // Cut the bell when leaving the question (early reveal)
  useEffect(() => () => sound.stopBell(), []);

  // Countdown display only; the reveal below does not depend on this tick.
  useEffect(() => {
    if (!deadline) return;
    const serverOffset = now ? Date.parse(now) - (fetchedAt ?? Date.now()) : 0;
    const tick = () => {
      setRemainingSec(Math.max(0, Math.ceil((Date.parse(deadline) - (Date.now() + serverOffset)) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [deadline, now, fetchedAt]);

  // Reveal: one timeout at deadline + GRACE_MS (server clock offset taken at fetch time),
  // or immediately once everyone answered. A failed attempt retries after REVEAL_RETRY_MS.
  useEffect(() => {
    const reveal = revealRef.current;
    const allAnswered = playerCount > 0 && answeredCount >= playerCount;
    if (!reveal || (!allAnswered && !deadline)) return;

    const serverOffset = now ? Date.parse(now) - (fetchedAt ?? Date.now()) : 0;
    const delay = allAnswered || !deadline ? 0 : revealDelayMs(Date.parse(deadline), Date.now() + serverOffset);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async () => {
      if (reveal.revealed || reveal.attempts >= MAX_REVEAL_ATTEMPTS) return;
      if (reveal.inFlight) {
        timer = setTimeout(attempt, REVEAL_RETRY_MS);
        return;
      }
      reveal.inFlight = true;
      reveal.attempts += 1;
      try {
        reveal.revealed = await onAdvance("reveal") === true;
      } catch {
        reveal.revealed = false;
      } finally {
        reveal.inFlight = false;
      }
      if (!reveal.revealed && !cancelled) timer = setTimeout(attempt, REVEAL_RETRY_MS);
    };

    timer = setTimeout(attempt, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [index, deadline, now, fetchedAt, playerCount, answeredCount, onAdvance]);

  const choices = question?.choices || [];
  const timeLimit = question?.time_limit_sec || 20;
  const timerRatio = Math.max(0, Math.min(1, remainingSec / timeLimit));
  const isUrgent = remainingSec <= 5 && remainingSec > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-3 py-2 sm:gap-5 sm:py-4">
      <div className="flex flex-col gap-3 text-center">
        <div className="flex items-center justify-between px-2">
          <Badge variant="outline" className="bg-card px-4 py-1.5 text-sm text-muted-foreground sm:text-base">
            ข้อที่ {index + 1} จาก {total}
          </Badge>
          <Badge variant="outline" className="gap-2 bg-card px-4 py-1.5 text-sm tabular-nums sm:text-base">
            <span aria-hidden className="size-2.5 rounded-full bg-emerald-500" />
            ตอบแล้ว {answeredCount} / {playerCount} คน
          </Badge>
        </div>

        <Card className="min-h-28 items-center justify-center p-6 sm:min-h-32 sm:p-8">
          <h2 className="text-center text-2xl leading-relaxed font-bold text-foreground sm:text-4xl lg:text-5xl">
            {question?.text || "กำลังโหลดคำถาม..."}
          </h2>
        </Card>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 py-2">
        <div
          className={cn(
            "flex size-20 items-center justify-center rounded-full border-4 bg-card shadow-md transition-all duration-300 sm:size-24",
            isUrgent ? "border-destructive bg-destructive/10 motion-safe:animate-pulse" : "border-primary",
          )}
        >
          <span
            className={cn(
              "font-mono text-3xl font-black tabular-nums sm:text-4xl",
              isUrgent ? "text-destructive" : "text-primary",
            )}
          >
            {remainingSec}
          </span>
        </div>
        <Progress
          value={timerRatio * 100}
          aria-label="เวลาที่เหลือ"
          className={cn(
            "h-2 max-w-md bg-muted",
            isUrgent && "[&_[data-slot=progress-indicator]]:bg-destructive",
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 pt-1 sm:gap-6 md:grid-cols-2">
        {choices.map((choice, i) => {
          const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
          const theme = answerTheme(i);
          return (
            <div
              key={choice.id || i}
              className={cn(
                "flex min-h-20 items-center gap-4 rounded-2xl border-2 p-4 shadow-md sm:min-h-24 sm:gap-6 sm:p-6",
                theme.tile,
              )}
            >
              <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl sm:size-14", theme.icon)}>
                <ChoiceIcon shape={style.shape} className="size-7 sm:size-8" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn("mb-0.5 block text-sm font-bold tracking-wider uppercase sm:text-base", theme.label)}>
                  {style.label} · {style.name}
                </span>
                <div className="text-xl leading-snug font-bold break-words sm:text-2xl lg:text-3xl">{choice.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
