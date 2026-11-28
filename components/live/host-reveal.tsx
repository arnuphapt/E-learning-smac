"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { CHOICE_STYLES } from "@/lib/live";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChoiceIcon } from "./choice-icon";
import { answerTheme } from "./answer-palette";

interface LiveChoice {
  id: string;
  text: string;
}

export interface HostRevealState {
  question?: {
    text?: string;
    choices?: LiveChoice[];
  } | null;
  answer?: string | null;
  distribution?: Record<string, number>;
  index: number;
  total: number;
  answeredCount?: number;
  playerCount?: number;
}

export function HostReveal({
  state,
  onAdvance,
  advancing,
}: {
  state: HostRevealState;
  onAdvance: (action: string) => unknown;
  advancing?: boolean;
}) {
  const { question, answer, distribution = {}, index, total, answeredCount = 0, playerCount = 0 } = state;
  const choices = question?.choices || [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-3 py-2 sm:gap-5 sm:py-4">
      <div className="flex flex-col gap-3 text-center">
        <div className="flex items-center justify-between px-2">
          <Badge variant="outline" className="db-chip px-4 py-1.5 text-sm font-semibold sm:text-base">
            เฉลยข้อที่ {index + 1} จาก {total}
          </Badge>
          <Badge variant="outline" className="db-chip px-4 py-1.5 text-sm font-semibold sm:text-base">
            ผู้ตอบ {answeredCount} / {playerCount} คน
          </Badge>
        </div>

        <Card className="db-panel min-h-24 items-center justify-center p-6 sm:min-h-28 sm:p-8">
          <h2 className="text-center text-2xl leading-relaxed font-bold text-[var(--text)] sm:text-3xl lg:text-4xl">
            {question?.text || "คำถาม"}
          </h2>
        </Card>
      </div>

      <div className="my-2 grid grid-cols-1 gap-4 sm:my-3 sm:gap-6 md:grid-cols-2">
        {choices.map((choice, i) => {
          const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
          const theme = answerTheme(i);
          const isCorrect = choice.id === answer;
          const count = distribution[choice.id] || 0;
          const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;

          return (
            <Card
              key={choice.id || i}
              className={cn(
                "db-panel relative justify-between gap-0 overflow-hidden p-4 sm:p-6",
                isCorrect ? "ring-3 ring-[var(--accept)]" : "opacity-75",
              )}
            >
              {/* Fill = share of players who picked this option (computed width) */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 transition-all duration-500",
                  isCorrect ? "bg-[var(--accept)]/25" : "bg-[var(--surface-1)]",
                )}
                style={{ width: `${pct}%` }}
              />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border-2 border-[var(--rim)] shadow", theme.badge)}>
                    <ChoiceIcon shape={style.shape} className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="mb-0.5 block text-sm font-bold tracking-wider text-[var(--text-muted)] uppercase sm:text-base">
                      {style.label} · {style.name}
                    </span>
                    <div className="text-xl font-bold break-words text-[var(--text)] sm:text-2xl">{choice.text}</div>
                  </div>
                </div>

                {isCorrect ? (
                  <Badge variant="outline" className="shrink-0 gap-1.5 border-[var(--rim)] bg-[var(--accept)] px-3 py-1.5 text-sm font-bold text-[var(--text)] sm:text-base">
                    <CheckIcon aria-hidden />
                    คำตอบที่ถูกต้อง
                  </Badge>
                ) : (
                  <XIcon aria-hidden className="size-6 shrink-0 text-[var(--text-muted)]" />
                )}
              </div>

              <div className="relative z-10 mt-4 flex items-center justify-between border-t border-[var(--frame-soft)] pt-2 font-mono text-sm tabular-nums sm:text-base">
                <span className="font-medium text-[var(--text-strong)]">{count} คนเลือกข้อนี้</span>
                <span className={cn("font-bold", isCorrect ? "text-[var(--gold)]" : "text-[var(--text-muted)]")}>{pct}%</span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <Button
          size="lg"
          className="db-btn db-btn--accept h-auto px-8 py-3.5 text-[19px] font-bold sm:text-xl"
          onClick={() => onAdvance("leaderboard")}
          disabled={advancing}
        >
          ถัดไป
          <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}
