"use client";

import { ArrowRightIcon, CheckIcon } from "lucide-react";
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
          <Badge variant="outline" className="bg-card px-4 py-1.5 text-sm text-muted-foreground sm:text-base">
            เฉลยข้อที่ {index + 1} จาก {total}
          </Badge>
          <Badge variant="outline" className="bg-card px-4 py-1.5 text-sm sm:text-base">
            ผู้ตอบ {answeredCount} / {playerCount} คน
          </Badge>
        </div>

        <Card className="min-h-24 items-center justify-center p-6 sm:min-h-28 sm:p-8">
          <h2 className="text-center text-2xl leading-relaxed font-bold text-foreground sm:text-3xl lg:text-4xl">
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
                "relative justify-between gap-0 overflow-hidden border-2 p-4 sm:p-6",
                isCorrect ? "border-success bg-success-soft/40 ring-4 ring-success/20" : "border-border opacity-60",
              )}
            >
              {/* Fill = share of players who picked this option (computed width) */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 transition-all duration-500",
                  isCorrect ? "bg-success/15" : "bg-muted",
                )}
                style={{ width: `${pct}%` }}
              />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl shadow", theme.badge)}>
                    <ChoiceIcon shape={style.shape} className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <span className={cn("mb-0.5 block text-sm font-bold tracking-wider text-muted-foreground uppercase sm:text-base")}>
                      {style.label} · {style.name}
                    </span>
                    <div className="text-xl font-bold break-words text-foreground sm:text-2xl">{choice.text}</div>
                  </div>
                </div>

                {isCorrect && (
                  <Badge variant="outline" className="shrink-0 gap-1.5 border-success bg-success-soft px-3 py-1.5 text-sm text-success sm:text-base">
                    <CheckIcon aria-hidden />
                    คำตอบที่ถูกต้อง
                  </Badge>
                )}
              </div>

              <div className="relative z-10 mt-4 flex items-center justify-between border-t pt-2 font-mono text-sm sm:text-base">
                <span className="font-medium text-foreground">{count} คนเลือกข้อนี้</span>
                <span className={cn("font-bold", isCorrect ? "text-success" : "text-muted-foreground")}>{pct}%</span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <Button
          size="lg"
          className="h-auto rounded-full px-8 py-3.5 text-lg font-bold shadow-md sm:text-xl"
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
