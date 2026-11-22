"use client";

import { useState, useEffect, useCallback } from "react";
import { CHOICE_STYLES } from "@/lib/live";
import { CheckIcon, CircleCheckIcon, MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChoiceIcon } from "./choice-icon";
import { answerTheme } from "./answer-palette";
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
}: {
  state: PlayerQuestionState;
  sessionId: string;
  onRefresh?: () => void;
}) {
  const { question, index, total, deadline, now, me } = state;
  const choices = question?.choices || [];

  const [submitting, setSubmitting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(me?.chosen || null);
  const [hasAnswered, setHasAnswered] = useState(!!me?.answered);
  const [statusMessage, setStatusMessage] = useState(
    me?.answered ? "ส่งคำตอบแล้ว รอเฉลย" : ""
  );

  // Sync with state changes (e.g. phase or index change)
  useEffect(() => {
    setHasAnswered(!!me?.answered);
    if (me?.chosen) {
      setSelectedChoice(me.chosen);
    }
    if (me?.answered) {
      setStatusMessage("ส่งคำตอบแล้ว รอเฉลย");
    }
  }, [me, index]);

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

  const handleSelectChoice = useCallback(
    async (choiceId: string) => {
      if (hasAnswered || submitting || !sessionId) return;
      sound.play("answer");
      try {
        setSubmitting(true);
        setSelectedChoice(choiceId);
        setStatusMessage("");

        const res = await fetch(`/api/live/${sessionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_idx: index,
            chosen: choiceId,
          }),
        });

        if (res.ok) {
          setHasAnswered(true);
          setStatusMessage("ส่งคำตอบแล้ว รอเฉลย");
          if (onRefresh) onRefresh();
        } else {
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
            setSelectedChoice(null);
            setStatusMessage(errMsg || "เกิดข้อผิดพลาดในการส่งคำตอบ");
          }
          if (onRefresh) onRefresh();
        }
      } catch (e: unknown) {
        console.error("Answer submit failed:", e);
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
      <div className="flex items-center justify-between border-b px-2 pb-3">
        <span className="text-sm font-semibold text-muted-foreground">
          ข้อที่ {index + 1} จาก {total}
        </span>

        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 shadow-xs">
          <span className="text-xs text-muted-foreground">เหลือเวลา</span>
          <span
            className={cn(
              "font-mono text-base font-bold tabular-nums",
              remainingSec <= 5 ? "text-destructive motion-safe:animate-pulse" : "text-primary",
            )}
          >
            {remainingSec}s
          </span>
        </div>
      </div>

      {hasAnswered ? (
        <div className="my-2 rounded-2xl border border-primary/20 bg-primary-soft p-3 text-center shadow-xs motion-safe:animate-in motion-safe:fade-in sm:p-4">
          <div className="mb-1 inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
            <CheckIcon className="size-5" aria-hidden />
          </div>
          <div className="text-base font-bold text-foreground sm:text-lg">{statusMessage || "ส่งคำตอบแล้ว รอเฉลย"}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">คำตอบถูกบันทึกที่ระบบแล้ว รอผู้สอนเปิดเฉลยบนหน้าจอ</p>
        </div>
      ) : (
        <div className="my-2 text-center">
          {statusMessage && (
            <div
              role="alert"
              className="mb-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive motion-safe:animate-in motion-safe:fade-in"
            >
              <div>{statusMessage}</div>
              <p className="mt-0.5 text-xs font-normal opacity-90">แตะเลือกคำตอบอีกครั้งเพื่อลองใหม่</p>
            </div>
          )}
          <div className="mb-0.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary sm:text-sm">
            <MonitorIcon className="size-4" aria-hidden />
            <span>ดูคำถามบนจอผู้สอน</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            แตะเลือกคำตอบด้านล่าง
            {/* Keyboard hint only on devices with a fine pointer (hidden on touch) */}
            <span className="hidden [@media(pointer:fine)]:inline"> หรือกด 1-4 บนคีย์บอร์ด</span>
          </p>
        </div>
      )}

      {/* Capped tile height so 4 choices fit on 390x844 without scrolling */}
      <div
        className={cn(
          "my-2 grid flex-1 content-center gap-2.5 sm:gap-3",
          choices.length <= 2 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        )}
      >
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
              disabled={isDisabled}
              onClick={() => handleSelectChoice(choice.id)}
              className={cn(
                "relative h-auto min-h-14 justify-start gap-3 rounded-2xl border-2 p-3 text-left whitespace-normal no-underline shadow-sm hover:no-underline active:scale-[0.98] sm:p-4",
                choices.length > 2 ? "max-h-20 sm:max-h-28" : "max-h-30 sm:max-h-36",
                isSelected
                  ? cn(theme.tile, "opacity-100 shadow-md ring-4 ring-primary disabled:opacity-100")
                  : isDisabled
                    ? "border-border bg-muted/70 text-muted-foreground disabled:opacity-60"
                    : cn(theme.tile, "hover:brightness-105"),
              )}
            >
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs", theme.icon)}>
                <ChoiceIcon shape={style.shape} className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <span className={cn("mb-0.5 block text-[11px] font-bold tracking-wider uppercase", theme.label)}>
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
