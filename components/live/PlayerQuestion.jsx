"use client";

import { useState, useEffect, useCallback } from "react";
import { CHOICE_STYLES } from "@/lib/live";
import { ChoiceIcon } from "./ChoiceIcon";
import * as sound from "@/lib/live-sound";

// Solid, high-contrast readable answer colors matching house light theme (all >= 4.5:1 WCAG AA)
const ANSWER_THEMES = [
  {
    bg: "bg-[#dc2626]",
    border: "border-[#b91c1c]",
    text: "text-white",
    labelText: "text-white/90",
    iconBg: "bg-black/20 text-white",
    checkBg: "bg-white text-[#dc2626]",
  },
  {
    bg: "bg-[#1d4ed8]",
    border: "border-[#1e40af]",
    text: "text-white",
    labelText: "text-white/90",
    iconBg: "bg-black/20 text-white",
    checkBg: "bg-white text-[#1d4ed8]",
  },
  {
    bg: "bg-[#f59e0b]",
    border: "border-[#d97706]",
    text: "text-[#0f172a]",
    labelText: "text-[#78350f]",
    iconBg: "bg-black/15 text-[#0f172a]",
    checkBg: "bg-[#0f172a] text-[#f59e0b]",
  },
  {
    bg: "bg-[#15803d]",
    border: "border-[#166534]",
    text: "text-white",
    labelText: "text-white/90",
    iconBg: "bg-black/20 text-white",
    checkBg: "bg-white text-[#15803d]",
  },
];

export function PlayerQuestion({ state, sessionId, onRefresh }) {
  const { question, index, total, deadline, now, me } = state;
  const choices = question?.choices || [];

  const [submitting, setSubmitting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(me?.chosen || null);
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
    async (choiceId) => {
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
          const errData = await res.json().catch(() => ({}));
          // Handle 409 cases: หมดเวลา, ตอบไปแล้ว
          if (res.status === 409) {
            setHasAnswered(true);
            setStatusMessage(errData.error || "ส่งคำตอบแล้ว");
          } else {
            setSelectedChoice(null);
            setStatusMessage(errData.error || "เกิดข้อผิดพลาดในการส่งคำตอบ");
          }
          if (onRefresh) onRefresh();
        }
      } catch (e) {
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
    const handleKeyDown = (e) => {
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
    <div className="flex-1 flex flex-col justify-between w-full h-full max-w-lg mx-auto py-2 sm:py-4">
      {/* Hide keyboard shortcut hint on touch devices (pointer: coarse) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (pointer: coarse) {
          .keyboard-hint {
            display: none !important;
          }
        }
      `}} />

      {/* Top Header: Question number & Timer */}
      <div className="flex items-center justify-between px-2 pb-3 border-b border-border">
        <span className="text-sm font-semibold text-muted-foreground">
          ข้อที่ {index + 1} จาก {total}
        </span>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground">เหลือเวลา</span>
          <span
            className={`font-mono font-bold text-base tabular-nums ${
              remainingSec <= 5 ? "text-destructive motion-safe:animate-pulse" : "text-primary"
            }`}
          >
            {remainingSec}s
          </span>
        </div>
      </div>

      {/* Status banner when answered or waiting with prompt to look at teacher's screen */}
      {hasAnswered ? (
        <div className="my-2 p-3 sm:p-4 rounded-[18px] bg-primary-soft border border-primary/20 text-center shadow-xs motion-safe:animate-fade-in">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white mb-1 shadow-xs">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-base sm:text-lg font-bold text-foreground">
            {statusMessage || "ส่งคำตอบแล้ว รอเฉลย"}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            คำตอบถูกบันทึกที่ระบบแล้ว รอผู้สอนเปิดเฉลยบนหน้าจอ
          </p>
        </div>
      ) : (
        <div className="my-2 text-center">
          {statusMessage && (
            <div
              role="alert"
              className="mb-2 p-3 rounded-[14px] bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold motion-safe:animate-fade-in"
            >
              <div>{statusMessage}</div>
              <p className="text-xs font-normal opacity-90 mt-0.5">
                แตะเลือกคำตอบอีกครั้งเพื่อลองใหม่
              </p>
            </div>
          )}
          <div className="text-xs sm:text-sm font-semibold text-primary flex items-center justify-center gap-1.5 mb-0.5">
            <span>📺</span>
            <span>ดูคำถามบนจอผู้สอน</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            แตะเลือกคำตอบด้านล่าง
            <span className="keyboard-hint hidden [@media(pointer:fine)]:inline"> หรือกด 1-4 บนคีย์บอร์ด</span>
          </p>
        </div>
      )}

      {/* 2-4 Answer Buttons Grid - capped tile height so 4 choices fit on 390x844 without scrolling */}
      <div
        className={`grid ${
          choices.length <= 2 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
        } gap-2.5 sm:gap-3 flex-1 my-2 content-center`}
      >
        {choices.map((choice, i) => {
          const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
          const theme = ANSWER_THEMES[i] || ANSWER_THEMES[0];
          const isSelected = selectedChoice === choice.id;
          const isDisabled = hasAnswered || submitting;

          return (
            <button
              key={choice.id || i}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectChoice(choice.id)}
              className={`relative flex items-center gap-3 p-3 sm:p-4 rounded-[16px] border-2 shadow-sm text-left transition-all active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-primary/30 min-h-[58px] ${
                choices.length > 2 ? "max-h-[82px] sm:max-h-[110px]" : "max-h-[120px] sm:max-h-[150px]"
              } ${
                isSelected
                  ? `${theme.bg} ${theme.border} ring-4 ring-primary shadow-md`
                  : isDisabled
                  ? "bg-muted/70 border-border text-muted-foreground opacity-60 cursor-not-allowed"
                  : `${theme.bg} ${theme.border} ${theme.text} hover:brightness-105 cursor-pointer`
              }`}
            >
              <div className={`w-10 h-10 rounded-[12px] ${theme.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                <ChoiceIcon shape={style.shape} className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.labelText}`}>
                    {style.label} · {style.name}
                  </span>
                </div>
                <div className={`text-sm sm:text-base font-bold ${theme.text} break-words leading-tight line-clamp-2`}>
                  {choice.text}
                </div>
              </div>

              {isSelected && (
                <div className={`shrink-0 w-6 h-6 rounded-full ${theme.checkBg} flex items-center justify-center font-bold text-xs shadow-xs`}>
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
