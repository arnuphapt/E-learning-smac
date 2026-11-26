"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckIcon, ClockIcon, Loader2Icon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import {
  POINTS_DEFAULT,
  POINTS_MAX,
  POINTS_MIN,
  POINTS_STEP,
  TIME_LIMITS,
  isValidPoints,
  validateQuiz,
} from "@/lib/live";
import { useConfirm } from "@/components/common/confirm";
import { FormField } from "@/components/common/form-field";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  emptyDraftQuestion,
  groupProblemsByIndex,
  loadQuizForEdit,
  mostCommonValue,
  type QuizQuestionDraftItem,
} from "@/components/live/quiz-draft";
import {
  QuizQuestionEditor,
  type QuestionDraft,
  type QuizQuestion,
} from "@/components/live/quiz-question-editor";

/** Modal for creating or editing a live quiz together with its questions; mount only while open. */
export function QuizDialog({
  quizId,
  onClose,
  onSave,
  loading,
}: {
  quizId?: string | null;
  onClose: () => void;
  onSave: (input: { title: string; questions: QuizQuestionDraftItem[]; initialIds: Set<string> }) => Promise<void>;
  loading?: boolean;
}) {
  const confirm = useConfirm();
  const isEdit = Boolean(quizId);

  const [fetching, setFetching] = useState(isEdit);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionDraftItem[]>(() => (isEdit ? [] : [emptyDraftQuestion(1)]));
  const [initialIds, setInitialIds] = useState<Set<string>>(() => new Set());
  const [dirty, setDirty] = useState(false);

  const [defaultTimeLimit, setDefaultTimeLimit] = useState<number>(20);
  const [defaultPointsInput, setDefaultPointsInput] = useState<string>(String(POINTS_DEFAULT));
  const defaultPointsInvalid = !isValidPoints(defaultPointsInput);

  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;
    loadQuizForEdit(quizId)
      .then((loaded) => {
        if (cancelled) return;
        setTitle(loaded.title);
        setQuestions(loaded.questions);
        setInitialIds(new Set(loaded.questions.map((q) => q.id)));
        setDefaultTimeLimit(
          mostCommonValue(
            loaded.questions.map((q) => q.time_limit_sec),
            20,
          ),
        );
        setDefaultPointsInput(
          String(
            mostCommonValue(
              loaded.questions.map((q) => q.points),
              POINTS_DEFAULT,
            ),
          ),
        );
        setDirty(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error("โหลดชุดควิซไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)));
        onClose();
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId, onClose]);

  const validation = useMemo(() => validateQuiz(questions), [questions]);
  const problemsByIndex = useMemo(() => groupProblemsByIndex(validation.problems), [validation.problems]);

  const hasUnsavedContent = isEdit
    ? dirty
    : Boolean(title.trim()) ||
      questions.length !== 1 ||
      Boolean(questions[0]?.text?.trim()) ||
      questions[0]?.choices?.some((c) => Boolean(c.text.trim())) ||
      Boolean(questions[0]?.answer);

  const requestClose = async () => {
    if (loading) return;
    if (hasUnsavedContent) {
      const ok = await confirm({
        danger: true,
        title: isEdit ? "ยกเลิกการแก้ไขชุดควิซ?" : "ยกเลิกการสร้างชุดควิซ?",
        message: "การเปลี่ยนแปลงที่ยังไม่บันทึกจะหายไป",
        confirmText: "ออกโดยไม่บันทึก",
        cancelText: "กลับไปแก้ไข",
      });
      if (!ok) return;
    }
    onClose();
  };

  const handleDefaultTimeChange = (value: string) => {
    const sec = Number(value);
    setDefaultTimeLimit(sec);
    setDirty(true);
    setQuestions((prev) => prev.map((q) => ({ ...q, time_limit_sec: sec })));
  };

  const handleDefaultPointsChange = (value: string) => {
    setDefaultPointsInput(value);
    if (isValidPoints(value)) {
      const pts = Number(value);
      setDirty(true);
      setQuestions((prev) => prev.map((q) => ({ ...q, points: pts })));
    }
  };

  const handleSaveQuestion = useCallback((draft: QuestionDraft) => {
    setDirty(true);
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === draft.id
          ? {
              ...q,
              text: draft.text,
              choices: draft.choices,
              answer: draft.answer,
              time_limit_sec: draft.time_limit_sec,
              points: draft.points,
            }
          : q,
      ),
    );
    return true;
  }, []);

  const handleAddQuestion = () => {
    setDirty(true);
    setQuestions((prev) => [
      ...prev,
      emptyDraftQuestion(prev.length + 1, {
        time_limit_sec: defaultTimeLimit,
        points: isValidPoints(defaultPointsInput) ? Number(defaultPointsInput) : POINTS_DEFAULT,
      }),
    ]);
  };

  const handleDeleteQuestion = async (target: QuizQuestion) => {
    if (isEdit) {
      const ok = await confirm({
        danger: true,
        title: "ยืนยันการลบคำถาม",
        message: `คุณต้องการลบคำถามข้อที่ ${target.no} หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้เมื่อบันทึก`,
        confirmText: "ลบคำถาม",
      });
      if (!ok) return;
    }
    setDirty(true);
    setQuestions((prev) =>
      prev
        .filter((q) => q.id !== target.id)
        .map((q, idx) => ({ ...q, no: idx + 1 })),
    );
  };

  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    setDirty(true);
    setQuestions((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((q, idx) => ({ ...q, no: idx + 1 }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || fetching) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("กรุณากรอกชื่อชุดควิซ");
      return;
    }
    if (!validation.ok) return;
    setTitleError(null);
    await onSave({ title: trimmed, questions, initialIds });
  };

  const canSubmit = Boolean(title.trim()) && validation.ok && !loading && !fetching;

  return (
    <Dialog open onOpenChange={(open) => !open && void requestClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border/60 px-6 py-4 pr-12">
            <DialogTitle>{isEdit ? "แก้ไขชุดควิซ" : "สร้างชุดควิซ"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "แก้ไขชื่อและคำถามในชุดควิซ แล้วกดบันทึกเพื่ออัปเดต"
                : "ตั้งชื่อชุดควิซและเพิ่มคำถามให้พร้อมสำหรับการเปิดห้องแข่งขันสด"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {fetching ? (
              <LoadingState label="กำลังโหลดชุดควิซ..." className="min-h-60" />
            ) : (
              <>
                <FormField label="ชื่อชุดควิซ" htmlFor="live-quiz-title" required error={titleError}>
                  <Input
                    id="live-quiz-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setDirty(true);
                      if (titleError) setTitleError(null);
                    }}
                    placeholder="เช่น แบบทดสอบทบทวนบทที่ 1"
                    autoFocus={!isEdit}
                    disabled={loading}
                  />
                </FormField>

                <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                  <span className="text-xs font-semibold text-foreground">ค่าเริ่มต้นทุกข้อ</span>
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="quiz-default-time" className="text-xs text-muted-foreground">
                      <ClockIcon className="size-3.5" aria-hidden />
                      เวลาต่อข้อ:
                    </Label>
                    <Select value={String(defaultTimeLimit)} onValueChange={handleDefaultTimeChange} disabled={loading}>
                      <SelectTrigger id="quiz-default-time" size="sm" aria-label="เวลาเริ่มต้นต่อข้อ" className="min-w-28 bg-card text-xs font-semibold">
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
                    <Label htmlFor="quiz-default-points" className="text-xs text-muted-foreground">
                      คะแนน:
                    </Label>
                    <Input
                      id="quiz-default-points"
                      type="number"
                      inputMode="numeric"
                      min={POINTS_MIN}
                      max={POINTS_MAX}
                      step={POINTS_STEP}
                      value={defaultPointsInput}
                      onChange={(e) => handleDefaultPointsChange(e.target.value)}
                      aria-label="คะแนนเริ่มต้นต่อข้อ"
                      aria-invalid={defaultPointsInvalid}
                      title={`${POINTS_MIN}-${POINTS_MAX} เพิ่มทีละ ${POINTS_STEP}`}
                      disabled={loading}
                      className="h-8 w-24 bg-card text-xs font-semibold"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">รายการคำถาม ({questions.length} ข้อ)</div>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddQuestion} disabled={loading}>
                    <PlusIcon />
                    เพิ่มคำถาม
                  </Button>
                </div>

                {questions.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">ต้องมีคำถามอย่างน้อย 1 ข้อในชุดควิซ</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion} disabled={loading}>
                      <PlusIcon />
                      เพิ่มคำถามข้อแรก
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {questions.map((q, index) => (
                      <QuizQuestionEditor
                        key={q.id}
                        question={q}
                        index={index}
                        total={questions.length}
                        problems={problemsByIndex[index] || []}
                        onSaveQuestion={handleSaveQuestion}
                        onDeleteQuestion={handleDeleteQuestion}
                        onMoveQuestion={handleMoveQuestion}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background px-6 py-3.5 sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              {fetching ? null : !title.trim() ? (
                <span className="text-muted-foreground">กรุณากรอกชื่อชุดควิซ</span>
              ) : validation.ok ? (
                <span className="flex items-center gap-1.5 text-success">
                  <CheckIcon className="size-3.5" aria-hidden />
                  {isEdit ? `พร้อมบันทึก (${questions.length} ข้อ)` : `พร้อมสร้าง (${questions.length} ข้อ)`}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-warning">
                  <TriangleAlertIcon className="size-3.5" aria-hidden />
                  {questions.length === 0
                    ? "ต้องมีคำถามอย่างน้อย 1 ข้อ"
                    : `มี ${validation.problems.length} จุดที่ต้องแก้ไข`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => void requestClose()} disabled={loading}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {loading ? <Loader2Icon className="animate-spin" /> : isEdit ? <CheckIcon /> : <PlusIcon />}
                {isEdit ? "บันทึกการแก้ไข" : "สร้างชุดควิซ"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
