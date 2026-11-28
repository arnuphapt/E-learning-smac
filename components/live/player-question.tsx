"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CHOICE_STYLES } from "@/lib/live";
import { CheckIcon, CircleCheckIcon, MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChoiceIcon } from "./choice-icon";
import { answerTheme } from "./answer-palette";
import { QuizPartnerDragon } from "./quiz-partner-dragon";
import type { QuizPartnerDragonInfo } from "@/lib/quiz-partner-dragon";
import * as sound from "@/lib/live-sound";

interface LiveChoice {
  id: string;
  text: string;
}

export interface PlayerQuestionState {
  question?: {
    time_limit_sec?: number;
    choices?: LiveChoice[];
  } | null;
  index: number;
  total: number;
  deadline?: string | null;
  now?: string | null;
  me?: {
    chosen?: string | null;
    answered?: boolean;
  };
}

export function PlayerQuestion({
  state,
  sessionId,
  onRefresh,
  partnerDragon = null,
}: {
  state: PlayerQuestionState;
  sessionId: string;
  onRefresh?: () => void;
  partnerDragon?: QuizPartnerDragonInfo | null;
}) {
  const { question, index, total, deadline, now, me } = state;
  const choices = question?.choices || [];
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(me?.chosen || null);
  const [hasAnswered, setHasAnswered] = useState(!!me?.answered);
  const [statusMessage, setStatusMessage] = useState(
    me?.answered ? "ส่งคำตอบแล้ว รอเฉลย" : ""
  );

  // Reset when the question index changes; for the same index only sync in the "answered"
  // direction, so a stale refetch can't re-enable buttons after an optimistic answer.
  const [prevIndex, setPrevIndex] = useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setHasAnswered(!!me?.answered);
    setSelectedChoice(me?.chosen || null);
    setStatusMessage(me?.answered ? "ส่งคำตอบแล้ว รอเฉลย" : "");
  } else if (me?.answered && !hasAnswered) {
    setHasAnswered(true);
    if (me.chosen) setSelectedChoice(me.chosen);
    setStatusMessage("ส่งคำตอบแล้ว รอเฉลย");
  }

  // Remaining timer for player
  const [remainingSec, setRemainingSec] = useState(() => {
    if (!deadline) return question?.time_limit_sec || 20;
    const serverOffset = now ? Date.parse(now) - Date.now() : 0;
    const currentServerTime = Date.now() + serverOffset;
    return Math.max(0, Math.ceil((Date.parse(deadline) - currentServerTime) / 1000));
  });

  useEffect(() => {
    if (!deadline) return;
    const serverOffset = now ? Date.parse(now) - Date.now() : 0;
    const timer = setInterval(() => {
      const currentServerTime = Date.now() + serverOffset;
      const left = Math.max(0, Math.ceil((Date.parse(deadline) - currentServerTime) / 1000));
      setRemainingSec(left);
    }, 250);

    return () => clearInterval(timer);
  }, [deadline, now]);

  // Bell once per question when 5s remain (muted = silent via sound engine)
  const bellIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (remainingSec <= 5 && remainingSec > 0 && bellIndexRef.current !== index) {
      bellIndexRef.current = index;
      sound.bell();
    }
  }, [remainingSec, index]);

  // Cut the bell when leaving the question (early reveal)
  useEffect(() => () => sound.stopBell(), []);

  const handleSelectChoice = useCallback(
    async (choiceId: string) => {
      if (hasAnswered || submitting || !sessionId) return;
      sound.play("answer");
      try {
        // optimistic: show "sent" immediately, roll back below on failure
        setSubmitting(true);
        setSelectedChoice(choiceId);
        setHasAnswered(true);
        setStatusMessage("ส่งคำตอบแล้ว รอเฉลย");

        const res = await fetch(`/api/live/${sessionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_idx: index,
            chosen: choiceId,
          }),
        });

        if (!res.ok) {
          const rawErr: unknown = await res.json().catch(() => ({}));
          const errMsg =
            rawErr && typeof rawErr === "object" && "error" in rawErr && typeof rawErr.error === "string"
              ? rawErr.error
              : null;
          // Handle 409 cases: หมดเวลา, ตอบไปแล้ว
          if (res.status === 409) {
            setHasAnswered(true);
            setStatusMessage(errMsg || "ส่งคำตอบแล้ว");
          } else {
            setHasAnswered(false);
            setSelectedChoice(null);
            setStatusMessage(errMsg || "เกิดข้อผิดพลาดในการส่งคำตอบ");
          }
          if (onRefresh) onRefresh();
        }
      } catch (e: unknown) {
        console.error("Answer submit failed:", e);
        setHasAnswered(false);
        setSelectedChoice(null);
        setStatusMessage("เชื่อมต่อขัดข้อง โปรดลองใหม่");
      } finally {
        setSubmitting(false);
      }
    },
    [hasAnswered, submitting, sessionId, index, onRefresh]
  );

  // Keyboard navigation for answer buttons (1, 2, 3, 4 or A, B, C, D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasAnswered || submitting) return;
      const key = e.key?.toLowerCase();
      let pickedIndex = -1;
      if (key === "1" || key === "a") pickedIndex = 0;
      else if (key === "2" || key === "b") pickedIndex = 1;
      else if (key === "3" || key === "c") pickedIndex = 2;
      else if (key === "4" || key === "d") pickedIndex = 3;

      if (pickedIndex >= 0 && choices[pickedIndex]) {
        e.preventDefault();
        handleSelectChoice(choices[pickedIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasAnswered, submitting, choices, handleSelectChoice]);


  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col justify-between py-2 sm:py-4">
      <div className="db-panel flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-sm font-bold text-[var(--text-strong)] tabular-nums">
          ข้อที่ {index + 1} จาก {total}
        </span>

        <div className="db-chip db-chip--dark px-3 py-1">
          <span className="text-xs text-[var(--text-muted)]">เหลือเวลา</span>
          <span
            className={cn(
              "font-mono text-base font-black tabular-nums",
              remainingSec <= 5 ? "text-[var(--warn)] motion-safe:animate-pulse" : "text-[var(--timer-text)]",
            )}
          >
            {remainingSec}s
          </span>
        </div>
      </div>

      {hasAnswered ? (
        <div className="db-panel my-2 border-t-[var(--accept)] border-b-[var(--accept)] p-3 text-center motion-safe:animate-in motion-safe:fade-in sm:p-4">
          <div className="mb-1 inline-flex size-8 items-center justify-center rounded-full bg-[var(--accept)] text-[var(--text)] shadow-xs">
            <CheckIcon className="size-5" aria-hidden />
          </div>
          <div className="text-base font-bold text-[var(--text)] sm:text-lg">{statusMessage || "ส่งคำตอบแล้ว รอเฉลย"}</div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">คำตอบถูกบันทึกที่ระบบแล้ว รอผู้สอนเปิดเฉลยบนหน้าจอ</p>
        </div>
      ) : (
        <div className="my-2 text-center">
          {statusMessage && (
            <div
              role="alert"
              className="db-panel mb-2 border-t-[var(--cancel-ink)] border-b-[var(--cancel-ink)] p-3 text-sm font-semibold text-[var(--warn)] motion-safe:animate-in motion-safe:fade-in"
            >
              <div>{statusMessage}</div>
              <p className="mt-0.5 text-xs font-normal text-[var(--text-strong)]">แตะเลือกคำตอบอีกครั้งเพื่อลองใหม่</p>
            </div>
          )}
          <div className="db-world-label mb-0.5 flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--text)] sm:text-sm">
            <MonitorIcon className="size-4 text-[var(--gold)]" aria-hidden />
            <span>ดูคำถามบนจอผู้สอน</span>
          </div>
          <p className="db-world-label text-xs font-medium text-[var(--text)]">
            แตะเลือกคำตอบด้านล่าง
            {/* Keyboard hint only on devices with a fine pointer (hidden on touch) */}
            <span className="hidden [@media(pointer:fine)]:inline"> หรือกด 1-4 บนคีย์บอร์ด</span>
          </p>
        </div>
      )}

      {/* Capped tile height so 4 choices fit on 390x844 without scrolling */}
      <div
        ref={gridRef}
        className={cn(
          "relative my-2 grid flex-1 content-center gap-2.5 sm:gap-3",
          choices.length <= 2 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        <QuizPartnerDragon
          partner={partnerDragon}
          questionIndex={index}
          choiceCount={choices.length}
          sessionId={sessionId}
          takingOff={hasAnswered || submitting || remainingSec === 0}
          gridRef={gridRef}
        />
        {choices.map((choice, i) => {
          const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
          const theme = answerTheme(i);
          const isSelected = selectedChoice === choice.id;
          const isDisabled = hasAnswered || submitting;

          return (
            <Button
              key={choice.id || i}
              type="button"
              variant="link"
              data-choice-tile=""
              disabled={isDisabled}
              onClick={() => handleSelectChoice(choice.id)}
              className={cn(
                "db-choice-tile relative h-auto min-h-14 justify-start gap-3 p-3 text-left whitespace-normal no-underline shadow-sm hover:no-underline active:scale-[0.98] sm:p-4",
                choices.length > 2 ? "max-h-20 sm:max-h-28" : "max-h-30 sm:max-h-36",
                isSelected
                  ? cn(theme.tile, "db-choice-tile opacity-100 shadow-md ring-4 ring-[var(--gold)] disabled:opacity-100")
                  : isDisabled
                    ? "border-[var(--frame-soft)] bg-[var(--surface-well)] text-[var(--text-muted)] disabled:opacity-70"
                    : cn(theme.tile, "db-choice-tile hover:brightness-105"),
              )}
            >
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs", theme.icon)}>
                <ChoiceIcon shape={style.shape} className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "mb-0.5 block text-[11px] font-bold tracking-wider uppercase",
                    isDisabled && !isSelected
                      ? "text-[var(--text-muted)]"
                      : theme.label === "text-white/90"
                        ? "text-white"
                        : theme.label,
                  )}
                >
                  {style.label} · {style.name}
                </span>
                <div className="line-clamp-2 text-sm leading-tight font-bold break-words sm:text-base">{choice.text}</div>
              </div>

              {isSelected && (
                <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-full shadow-xs", theme.check)}>
                  <CircleCheckIcon className="size-4" aria-hidden />
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
