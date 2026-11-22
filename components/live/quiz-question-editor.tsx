"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  Loader2Icon,
  OctagonAlertIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { TIME_LIMITS, CHOICE_STYLES, type QuizProblem } from "@/lib/live";
import { FormField } from "@/components/common/form-field";
import { ToneBadge } from "@/components/common/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChoiceIcon } from "./choice-icon";
import { answerTheme } from "./answer-palette";

export interface QuizChoice {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  no?: number;
  text?: string | null;
  choices?: QuizChoice[];
  answer?: string | null;
  time_limit_sec?: number | null;
}

export interface QuestionDraft {
  id: string;
  text: string;
  choices: QuizChoice[];
  answer: string;
  time_limit_sec: number;
}

interface QuizQuestionEditorProps {
  question: QuizQuestion;
  index: number;
  total: number;
  problems?: QuizProblem[];
  onSaveQuestion: (draft: QuestionDraft) => Promise<boolean> | boolean;
  onDeleteQuestion: (question: QuizQuestion) => void;
  onMoveQuestion: (fromIndex: number, toIndex: number) => Promise<void> | void;
}

export function QuizQuestionEditor({
  question,
  index,
  total,
  problems = [],
  onSaveQuestion,
  onDeleteQuestion,
  onMoveQuestion,
}: QuizQuestionEditorProps) {
  const [text, setText] = useState(question.text || "");
  const [choices, setChoices] = useState<QuizChoice[]>(
    Array.isArray(question.choices) && question.choices.length > 0
      ? question.choices
      : [
          { id: "a", text: "" },
          { id: "b", text: "" },
        ]
  );
  const [answer, setAnswer] = useState(question.answer || "");
  const [timeLimitSec, setTimeLimitSec] = useState(question.time_limit_sec || 20);

  // Autosave status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("saved");
  const [moving, setMoving] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const pendingSaveRef = useRef<QuestionDraft | null>(null);
  const savingRef = useRef<Promise<boolean> | null>(null);
  const syncedIdRef = useRef(question.id);

  // Reordering or an older save response must not replace a local draft.
  useEffect(() => {
    if (syncedIdRef.current === question.id && pendingSaveRef.current) return;
    if (syncedIdRef.current !== question.id) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      pendingSaveRef.current = null;
      syncedIdRef.current = question.id;
    }
    setText(question.text || "");
    setChoices(
      Array.isArray(question.choices) && question.choices.length > 0
        ? question.choices
        : [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ]
    );
    setAnswer(question.answer || "");
    setTimeLimitSec(question.time_limit_sec || 20);
  }, [question.id, question.text, question.choices, question.answer, question.time_limit_sec]);

  const flushSave = useCallback(async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    // Serialize saves so an older write cannot finish after a newer draft.
    while (savingRef.current) await savingRef.current;
    const draft = pendingSaveRef.current;
    if (!draft) return true;

    const saving = (async () => {
      let success = false;
      try {
        success = await onSaveQuestion(draft);
      } catch (err: unknown) {
        console.error("Autosave error:", err);
      }
      if (pendingSaveRef.current === draft) {
        if (success) pendingSaveRef.current = null;
        if (mountedRef.current) setSaveStatus(success ? "saved" : "error");
      }
      return success;
    })();
    savingRef.current = saving;
    const success = await saving;
    if (savingRef.current === saving) savingRef.current = null;
    return success;
  }, [onSaveQuestion]);

  // Debounced save
  const triggerDebouncedSave = useCallback(
    (updatedFields: Omit<QuestionDraft, "id">) => {
      setSaveStatus("saving");
      pendingSaveRef.current = { id: question.id, ...updatedFields };
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(flushSave, 600);
    },
    [question.id, flushSave]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void flushSave();
    };
  }, [flushSave]);

  const handleMove = async (toIndex: number) => {
    if (moving) return;
    setMoving(true);
    try {
      // Drain any edits made while a previous save was in flight, too.
      do {
        if (!await flushSave()) return;
      } while (pendingSaveRef.current);
      await onMoveQuestion(index, toIndex);
    } finally {
      if (mountedRef.current) setMoving(false);
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    triggerDebouncedSave({ text: val, choices, answer, time_limit_sec: timeLimitSec });
  };

  const handleChoiceTextChange = (id: string, val: string) => {
    const nextChoices = choices.map((c) => (c.id === id ? { ...c, text: val } : c));
    setChoices(nextChoices);
    triggerDebouncedSave({ text, choices: nextChoices, answer, time_limit_sec: timeLimitSec });
  };

  const handleSelectAnswer = (id: string) => {
    setAnswer(id);
    triggerDebouncedSave({ text, choices, answer: id, time_limit_sec: timeLimitSec });
  };

  const handleTimeLimitChange = (value: string) => {
    const val = Number(value);
    setTimeLimitSec(val);
    triggerDebouncedSave({ text, choices, answer, time_limit_sec: val });
  };

  const handleAddChoice = () => {
    if (choices.length >= 4) return;
    const keys = ["a", "b", "c", "d"];
    const nextKey = keys[choices.length];
    const nextChoices = [...choices, { id: nextKey, text: "" }];
    setChoices(nextChoices);
    triggerDebouncedSave({ text, choices: nextChoices, answer, time_limit_sec: timeLimitSec });
  };

  const handleRemoveChoice = (removeIdx: number) => {
    if (choices.length <= 2) return;
    const keys = ["a", "b", "c", "d"];
    const remaining = choices.filter((_, idx) => idx !== removeIdx);
    const nextChoices = remaining.map((c, idx) => ({ id: keys[idx], text: c.text }));

    // If the removed or shifted choice was the answer, clear answer
    const currentAnswerIdx = choices.findIndex((c) => c.id === answer);
    let nextAnswer = answer;
    if (currentAnswerIdx >= removeIdx) {
      nextAnswer = "";
    }

    setChoices(nextChoices);
    setAnswer(nextAnswer);
    triggerDebouncedSave({ text, choices: nextChoices, answer: nextAnswer, time_limit_sec: timeLimitSec });
  };

  const isFirst = index === 0;
  const isLast = index === total - 1;
  const hasProblems = problems.length > 0;
  const no = question.no || index + 1;

  return (
    <Card role="article" aria-labelledby={`q-title-${question.id}`} className={cn("gap-0 p-5", hasProblems && "border-warning")}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground">{no}</span>
          <h3 id={`q-title-${question.id}`} className="text-base font-semibold text-foreground">
            ข้อที่ {no}
          </h3>
          {hasProblems ? (
            <ToneBadge tone="warning">
              <OctagonAlertIcon aria-hidden />
              ยังไม่พร้อม
            </ToneBadge>
          ) : (
            <ToneBadge tone="success">
              <CheckIcon aria-hidden />
              พร้อม
            </ToneBadge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 px-2 text-xs" aria-live="polite">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-primary">
                <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                กำลังบันทึก...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-success">
                <CheckIcon className="size-3.5" aria-hidden />
                บันทึกแล้ว
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 font-medium text-destructive">
                <OctagonAlertIcon className="size-3.5" aria-hidden />
                บันทึกไม่สำเร็จ
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Label htmlFor={`q-time-${question.id}`} className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
              <ClockIcon className="size-3.5" aria-hidden />
              เวลา:
            </Label>
            <Select value={String(timeLimitSec)} onValueChange={handleTimeLimitChange}>
              <SelectTrigger id={`q-time-${question.id}`} size="sm" aria-label="เวลาต่อข้อ" className="min-w-30 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_LIMITS.map((sec) => (
                  <SelectItem key={sec} value={String(sec)}>
                    {sec} วินาที
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">ลำดับ:</span>
            <div className="flex items-center overflow-hidden rounded-md border" role="group" aria-label="จัดลำดับคำถาม">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-none"
                onClick={() => handleMove(index - 1)}
                disabled={isFirst || moving}
                aria-label={`เลื่อนข้อที่ ${no} ขึ้น`}
              >
                <ChevronUpIcon />
              </Button>
              <span aria-hidden className="h-4 w-px bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-none"
                onClick={() => handleMove(index + 1)}
                disabled={isLast || moving}
                aria-label={`เลื่อนข้อที่ ${no} ลง`}
              >
                <ChevronDownIcon />
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDeleteQuestion(question)}
            aria-label={`ลบข้อที่ ${no}`}
          >
            <Trash2Icon />
          </Button>
        </div>
      </header>

      <FormField label="โจทย์คำถาม" htmlFor={`q-text-${question.id}`} required className="mt-4">
        <Textarea
          id={`q-text-${question.id}`}
          rows={3}
          value={text}
          onChange={handleTextChange}
          placeholder="พิมพ์โจทย์คำถามที่นี่..."
          className="min-h-20"
        />
      </FormField>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label id={`q-choices-${question.id}`}>
            ตัวเลือก (2–4 ข้อ) · เลือกวงกลมหน้าข้อที่ถูกต้อง
            <span aria-hidden className="text-destructive">
              *
            </span>
          </Label>
          <span className="text-xs text-muted-foreground">{choices.length}/4 ข้อ</span>
        </div>

        <RadioGroup
          value={answer}
          onValueChange={handleSelectAnswer}
          aria-labelledby={`q-choices-${question.id}`}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {choices.map((choice, cIdx) => {
            const style = CHOICE_STYLES[cIdx] || CHOICE_STYLES[0];
            const isAnswer = answer === choice.id;

            return (
              <div
                key={choice.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 p-2 transition-colors",
                  isAnswer ? "border-success bg-success-soft shadow-sm" : "border-border bg-card",
                )}
              >
                <RadioGroupItem
                  value={choice.id}
                  id={`q-${question.id}-ans-${choice.id}`}
                  className="mx-1 size-5"
                  title={isAnswer ? "คำตอบที่ถูกต้อง" : "คลิกเลือกเป็นคำตอบที่ถูกต้อง"}
                  aria-label={`เลือกตัวเลือก ${style.label} เป็นคำตอบที่ถูกต้อง`}
                />

                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-bold select-none",
                    answerTheme(cIdx).badge,
                  )}
                  title={`${style.name} (${style.label})`}
                >
                  <ChoiceIcon shape={style.shape} className="size-3.5" />
                  <span>{style.label}</span>
                </div>

                <Input
                  type="text"
                  value={choice.text}
                  onChange={(e) => handleChoiceTextChange(choice.id, e.target.value)}
                  placeholder={`ข้อความตัวเลือก ${style.label}...`}
                  aria-label={`ข้อความตัวเลือก ${style.label}`}
                  className="flex-1"
                />

                {choices.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemoveChoice(cIdx)}
                    aria-label={`ลบตัวเลือก ${style.label}`}
                  >
                    <XIcon />
                  </Button>
                )}
              </div>
            );
          })}
        </RadioGroup>

        {choices.length < 4 && (
          <div className="mt-1">
            <Button type="button" variant="secondary" size="sm" onClick={handleAddChoice}>
              <PlusIcon />
              เพิ่มตัวเลือก ({choices.length}/4)
            </Button>
          </div>
        )}
      </div>

      {hasProblems && (
        <Alert className="mt-4 border-warning bg-warning-soft text-warning">
          <TriangleAlertIcon />
          <AlertTitle>ข้อนี้ยังไม่พร้อมเปิดห้อง:</AlertTitle>
          <AlertDescription className="text-warning">
            <ul className="list-inside list-disc space-y-0.5">
              {problems.map((p, pIdx) => (
                <li key={pIdx}>{p.reason}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
