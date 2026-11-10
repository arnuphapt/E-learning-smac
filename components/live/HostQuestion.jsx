"use client";

import { useEffect, useState, useRef } from "react";
import { CHOICE_STYLES, GRACE_MS } from "@/lib/live";
import { ChoiceIcon } from "./ChoiceIcon";
import * as sound from "@/lib/live-sound";

export function HostQuestion({ state, onAdvance }) {
  const { question, index, total, deadline, now, answeredCount = 0, playerCount = 0 } = state;
  const revealRef = useRef(null);
  const lastHurrySecRef = useRef(null);

  // Compute countdown using deadline and server-now offset
  const [remainingSec, setRemainingSec] = useState(() => {
    if (!deadline) return question?.time_limit_sec || 20;
    const serverOffset = now ? Date.parse(now) - Date.now() : 0;
    const currentServerTime = Date.now() + serverOffset;
    return Math.max(0, Math.ceil((Date.parse(deadline) - currentServerTime) / 1000));
  });

  // Reset revealed trigger and hurry sound tracker on new question index
  useEffect(() => {
    revealRef.current = { revealed: false, inFlight: false, attempts: 0, retryAt: 0 };
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

  useEffect(() => {
    const serverOffset = now ? Date.parse(now) - Date.now() : 0;
    const reveal = revealRef.current;

    const checkReveal = async () => {
      const currentServerTime = Date.now() + serverOffset;
      if (deadline) {
        const left = Math.max(0, Math.ceil((Date.parse(deadline) - currentServerTime) / 1000));
        setRemainingSec(left);
      }

      const allAnswered = playerCount > 0 && answeredCount >= playerCount;
      const graceExpired = deadline && currentServerTime >= Date.parse(deadline) + GRACE_MS;
      if (
        (!allAnswered && !graceExpired) || reveal.revealed || reveal.inFlight ||
        reveal.attempts >= 3 || Date.now() < reveal.retryAt
      ) return;

      reveal.inFlight = true;
      reveal.attempts += 1;
      try {
        reveal.revealed = await onAdvance("reveal") === true;
      } catch {
        reveal.revealed = false;
      } finally {
        reveal.inFlight = false;
        reveal.retryAt = Date.now() + 2000;
      }
    };

    checkReveal();
    const timer = setInterval(checkReveal, 200);
    return () => clearInterval(timer);
  }, [index, deadline, now, playerCount, answeredCount, onAdvance]);

  const choices = question?.choices || [];
  const timeLimit = question?.time_limit_sec || 20;
  const timerRatio = Math.max(0, Math.min(1, remainingSec / timeLimit));
  const isUrgent = remainingSec <= 5 && remainingSec > 0;

  return (
    <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-5 max-w-6xl mx-auto w-full py-2 sm:py-4">
      {/* Question Header & Meta */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-between px-2">
          <span className="card px-4 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted-fg)] text-sm sm:text-base font-semibold shadow-xs">
            ข้อที่ {index + 1} จาก {total}
          </span>

          <div className="card flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm sm:text-base font-bold text-[var(--fg)] tabular-nums">
              ตอบแล้ว {answeredCount} / {playerCount} คน
            </span>
          </div>
        </div>

        {/* Question Text Billboard */}
        <div className="card rounded-[28px] p-6 sm:p-8 shadow-sm border border-[var(--border)] min-h-[110px] sm:min-h-[130px] flex items-center justify-center">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[var(--fg)] text-center leading-relaxed">
            {question?.text || "กำลังโหลดคำถาม..."}
          </h2>
        </div>
      </div>

      {/* Countdown Timer Visual */}
      <div className="py-2 flex flex-col items-center justify-center">
        <div
          className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 ${
            isUrgent ? "border-red-500 bg-red-50 motion-safe:animate-pulse" : "border-[var(--primary)] bg-white"
          } shadow-md transition-all duration-300`}
        >
          <span
            className={`text-3xl sm:text-4xl font-black font-mono tabular-nums ${
              isUrgent ? "text-red-600" : "text-[var(--primary)]"
            }`}
          >
            {remainingSec}
          </span>
        </div>
        {/* Progress bar line */}
        <div className="w-full max-w-md bg-slate-200 h-2 rounded-full mt-2 overflow-hidden border border-slate-300">
          <div
            className={`h-full transition-all duration-200 ${
              isUrgent ? "bg-red-500" : "bg-[var(--primary)]"
            }`}
            style={{ width: `${timerRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Choice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
        {choices.map((choice, i) => {
          const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
          return (
            <div
              key={choice.id || i}
              className={`flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[22px] border-2 shadow-md transition-transform ${style.bg} ${style.border} text-white min-h-[80px] sm:min-h-[100px]`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] bg-black/20 flex items-center justify-center shrink-0 shadow-inner">
                <ChoiceIcon shape={style.shape} className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold break-words leading-snug">
                  {choice.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
