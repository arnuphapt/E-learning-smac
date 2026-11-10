"use client";

import { CHOICE_STYLES } from "@/lib/live";
import { ChoiceIcon } from "./ChoiceIcon";

export function HostReveal({ state, onAdvance, advancing }) {
  const { question, answer, distribution = {}, index, total, answeredCount = 0, playerCount = 0 } = state;
  const choices = question?.choices || [];

  return (
    <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-5 max-w-6xl mx-auto w-full py-2 sm:py-4">
      {/* Header */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-between px-2">
          <span className="card px-4 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted-fg)] text-sm sm:text-base font-semibold shadow-xs">
            เฉลยข้อที่ {index + 1} จาก {total}
          </span>
          <div className="card flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] shadow-xs">
            <span className="text-sm sm:text-base font-bold text-[var(--fg)]">
              ผู้ตอบ {answeredCount} / {playerCount} คน
            </span>
          </div>
        </div>

        {/* Question Text */}
        <div className="card rounded-[28px] p-6 sm:p-8 shadow-sm border border-[var(--border)] min-h-[100px] sm:min-h-[120px] flex items-center justify-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--fg)] text-center leading-relaxed">
            {question?.text || "คำถาม"}
          </h2>
        </div>
      </div>

      {/* Choices with Distribution Bars & Correct Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-2 sm:my-3">
        {choices.map((choice, i) => {
          const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
          const isCorrect = choice.id === answer;
          const count = distribution[choice.id] || 0;
          const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;

          return (
            <div
              key={choice.id || i}
              className={`relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 rounded-[22px] border-2 shadow-sm transition-all card ${
                isCorrect
                  ? "border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-500/20"
                  : "border-[var(--border)] bg-white opacity-60"
              }`}
            >
              {/* Background fill based on distribution percentage */}
              <div
                className={`absolute top-0 bottom-0 left-0 pointer-events-none transition-all duration-500 ${
                  isCorrect ? "bg-emerald-500/15" : "bg-slate-200/50"
                }`}
                style={{ width: `${pct}%` }}
              />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${style.bg} text-white shadow`}
                  >
                    <ChoiceIcon shape={style.shape} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-[var(--fg)] break-words">
                      {choice.text}
                    </div>
                  </div>
                </div>

                {isCorrect && (
                  <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-500 text-emerald-800 text-sm sm:text-base font-bold shadow-xs">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>คำตอบที่ถูกต้อง</span>
                  </div>
                )}
              </div>

              {/* Vote Count & Percent */}
              <div className="relative z-10 mt-4 flex items-center justify-between text-sm sm:text-base border-t border-[var(--border)] pt-2 font-mono">
                <span className="text-[var(--fg)] font-medium text-sm sm:text-base">
                  {count} คนเลือกข้อนี้
                </span>
                <span className={`font-bold text-sm sm:text-base ${isCorrect ? "text-emerald-700" : "text-[var(--muted-fg)]"}`}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advance to Leaderboard */}
      <div className="flex justify-end pt-1">
        <button
          onClick={() => onAdvance("leaderboard")}
          disabled={advancing}
          className="btn btn-primary px-8 py-3.5 rounded-full font-bold text-lg sm:text-xl shadow-md flex items-center gap-2 cursor-pointer"
        >
          <span>ถัดไป</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
