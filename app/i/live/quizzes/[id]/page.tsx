"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, CircleAlertIcon, CircleHelpIcon, Loader2Icon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import type { Database, Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { isValidPoints, validateQuiz, type QuizProblem } from "@/lib/live";
import { PageContainer } from "@/components/common/page-container";
import { FormField } from "@/components/common/form-field";
import { EmptyState, LoadingState } from "@/components/common/states";
import { useConfirm } from "@/components/common/confirm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  QuizQuestionEditor,
  type QuizChoice,
  type QuizQuestion,
  type QuestionDraft,
} from "@/components/live/quiz-question-editor";

type LiveQuizRow = Pick<
  Database["public"]["Tables"]["live_quizzes"]["Row"],
  "id" | "title" | "owner_id" | "created_at" | "updated_at"
>;

type LiveQuizQuestionRow = Database["public"]["Tables"]["live_quiz_questions"]["Row"];

interface LiveQuizQuestionItem extends QuizQuestion {
  quiz_id: string;
  no: number;
  text: string;
  choices: QuizChoice[];
  answer: string;
  time_limit_sec: number;
  points: number;
}

interface QuizEditorPageProps {
  params?: Promise<{ id: string }> | { id?: string };
}

function isThenable<T>(value: unknown): value is Promise<T> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof (value as { then: unknown }).then === "function"
  );
}

function parseChoices(raw: Json): QuizChoice[] {
  if (!Array.isArray(raw)) return [];
  const result: QuizChoice[] = [];
  for (const item of raw) {
    if (typeof item === "object" && item !== null) {
      const rec = item as { id?: unknown; text?: unknown };
      result.push({
        id: typeof rec.id === "string" ? rec.id : String(rec.id ?? ""),
        text: typeof rec.text === "string" ? rec.text : String(rec.text ?? ""),
      });
    }
  }
  return result;
}

function toQuestionItem(row: LiveQuizQuestionRow): LiveQuizQuestionItem {
  return {
    id: row.id,
    quiz_id: row.quiz_id,
    no: row.no,
    text: row.text,
    choices: parseChoices(row.choices),
    answer: row.answer,
    time_limit_sec: row.time_limit_sec,
    points: row.points,
  };
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "";
  }
  return "";
}

export default function QuizEditorPage(props: QuizEditorPageProps) {
  const confirm = useConfirm();
  const routeParams = useParams();
  const resolvedParams = isThenable<{ id?: string }>(props?.params)
    ? React.use(props.params)
    : props?.params || routeParams;
  const rawQuizId = resolvedParams?.id || routeParams?.id;
  const quizId = typeof rawQuizId === "string" ? rawQuizId : Array.isArray(rawQuizId) ? rawQuizId[0] : undefined;

  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  const [quiz, setQuiz] = useState<LiveQuizRow | null>(null);
  const [questions, setQuestions] = useState<LiveQuizQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Title state & autosave
  const [title, setTitle] = useState("");
  const [titleSaveStatus, setTitleSaveStatus] = useState<"saving" | "saved" | "error">("saved"); // 'saving' | 'saved' | 'error'
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTitleRef = useRef<{ quizId: string; title: string } | null>(null);
  const titleSavingRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(false);

  // Action states
  const [addingQuestion, setAddingQuestion] = useState(false);

  // Fetch quiz and questions
  const fetchQuizData = useCallback(async () => {
    if (!quizId || !user?.id) return;
    try {
      setLoading(true);
      // Fetch quiz (RLS ensures user is instructor and owner)
      const { data: quizData, error: quizError } = await supabase
        .from("live_quizzes")
        .select("id, title, owner_id, created_at, updated_at")
        .eq("id", quizId)
        .maybeSingle();

      if (quizError || !quizData) {
        setNotFound(true);
        return;
      }

      setQuiz(quizData);
      setTitle(quizData.title || "");

      // Fetch questions ordered by no
      const { data: questionsData, error: questionsError } = await supabase
        .from("live_quiz_questions")
        .select("id, quiz_id, no, text, choices, answer, time_limit_sec, points")
        .eq("quiz_id", quizId)
        .order("no", { ascending: true });

      if (questionsError) throw questionsError;

      setQuestions((questionsData || []).map(toQuestionItem));
      setNotFound(false);
    } catch (err: unknown) {
      console.error("Error loading quiz:", err);
      toast.error("เกิดข้อผิดพลาดในการโหลดชุดควิซ: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [quizId, user?.id]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchQuizData();
  }, [user, authStatus, fetchQuizData]);

  const flushTitleSave = useCallback(async () => {
    clearTimeout(titleDebounceRef.current ?? undefined);
    titleDebounceRef.current = null;
    while (titleSavingRef.current) await titleSavingRef.current;
    const draft = pendingTitleRef.current;
    if (!draft) return true;

    const saving = (async () => {
      let success = false;
      try {
        const trimmed = draft.title.trim() || "ชุดควิซไม่มีชื่อ";
        const { error } = await supabase
          .from("live_quizzes")
          .update({
            title: trimmed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.quizId);

        if (error) throw error;
        success = true;
      } catch (err) {
        console.error("Error saving title:", err);
      }
      if (pendingTitleRef.current === draft) {
        if (success) pendingTitleRef.current = null;
        if (mountedRef.current) setTitleSaveStatus(success ? "saved" : "error");
      }
      return success;
    })();
    titleSavingRef.current = saving;
    const success = await saving;
    if (titleSavingRef.current === saving) titleSavingRef.current = null;
    return success;
  }, []);

  // Handle Title changes with 600ms debounce
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!quizId) return;
    setTitleSaveStatus("saving");
    pendingTitleRef.current = { quizId, title: newTitle };
    clearTimeout(titleDebounceRef.current ?? undefined);
    titleDebounceRef.current = setTimeout(flushTitleSave, 600);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void flushTitleSave();
    };
  }, [flushTitleSave]);

  // Save single question handler for QuizQuestionEditor
  const handleSaveQuestion = useCallback(
    async (updatedQ: QuestionDraft) => {
      if (!quizId) return false;
      try {
        const fields = {
          text: updatedQ.text,
          choices: updatedQ.choices,
          answer: updatedQ.answer,
          time_limit_sec: updatedQ.time_limit_sec,
          points: updatedQ.points,
        };
        if (!isValidPoints(fields.points)) return false;
        const { error } = await supabase
          .from("live_quiz_questions")
          .update({
            text: fields.text,
            choices: fields.choices.map((c) => ({ id: c.id, text: c.text })),
            answer: fields.answer,
            time_limit_sec: fields.time_limit_sec,
            points: fields.points,
          })
          .eq("id", updatedQ.id);

        if (error) throw error;

        await supabase
          .from("live_quizzes")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", quizId);

        // Keep local questions in sync for validation
        setQuestions((prev) =>
          prev.map((q) => (q.id === updatedQ.id ? { ...q, ...fields } : q))
        );
        return true;
      } catch (err) {
        console.error("Save question error:", err);
        return false;
      }
    },
    [quizId]
  );

  // Add question (appended to list)
  const handleAddQuestion = async () => {
    if (!quizId || addingQuestion) return;
    setAddingQuestion(true);
    try {
      const nextNo = questions.length + 1;
      const defaultChoices = [
        { id: "a", text: "" },
        { id: "b", text: "" },
      ];

      const { data, error } = await supabase
        .from("live_quiz_questions")
        .insert([
          {
            quiz_id: quizId,
            no: nextNo,
            text: "",
            choices: defaultChoices,
            answer: "",
            time_limit_sec: 20,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("live_quizzes")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", quizId);

      setQuestions((prev) => [...prev, toQuestionItem(data)]);
      toast.success(`เพิ่มข้อที่ ${nextNo} แล้ว`);
    } catch (err: unknown) {
      console.error("Add question error:", err);
      toast.error("ไม่สามารถเพิ่มคำถามได้: " + getErrorMessage(err));
    } finally {
      setAddingQuestion(false);
    }
  };

  // Delete question confirmation & execution
  const executeDeleteQuestion = async (targetQ: QuizQuestion) => {
    if (!quizId) return;

    try {
      const { error } = await supabase
        .from("live_quiz_questions")
        .delete()
        .eq("id", targetQ.id);

      if (error) throw error;

      // Re-sequence remaining questions' `no`
      const remaining = questions.filter((q) => q.id !== targetQ.id);
      const resequenced = remaining.map((q, idx) => ({ ...q, no: idx + 1 }));

      for (let i = 0; i < resequenced.length; i++) {
        if (remaining[i].no !== i + 1) {
          await supabase
            .from("live_quiz_questions")
            .update({ no: i + 1 })
            .eq("id", resequenced[i].id);
        }
      }

      await supabase
        .from("live_quizzes")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", quizId);

      setQuestions(resequenced);
      toast.success(`ลบข้อที่ ${targetQ.no} แล้ว`);
    } catch (err: unknown) {
      console.error("Delete question error:", err);
      toast.error("ไม่สามารถลบคำถามได้: " + getErrorMessage(err));
    }
  };

  const handleDeleteQuestion = async (target: QuizQuestion) => {
    const ok = await confirm({
      danger: true,
      title: "ยืนยันการลบคำถาม",
      message: `คุณต้องการลบคำถามข้อที่ ${target.no} หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบคำถาม",
    });
    if (ok) await executeDeleteQuestion(target);
  };

  // Move question up or down
  const handleMoveQuestion = async (fromIndex: number, toIndex: number) => {
    if (!quizId || toIndex < 0 || toIndex >= questions.length || fromIndex === toIndex) return;

    const qA = questions[fromIndex];
    const qB = questions[toIndex];
    const newNoA = qB.no;
    const newNoB = qA.no;

    // Optimistic state update
    setQuestions((prev) => prev.map((q) => {
      if (q.id === qA.id) return { ...q, no: newNoA };
      if (q.id === qB.id) return { ...q, no: newNoB };
      return q;
    }).sort((a, b) => a.no - b.no));

    try {
      const [{ error: errA }, { error: errB }] = await Promise.all([
        supabase
          .from("live_quiz_questions")
          .update({ no: newNoA })
          .eq("id", qA.id)
          .eq("quiz_id", quizId),
        supabase
          .from("live_quiz_questions")
          .update({ no: newNoB })
          .eq("id", qB.id)
          .eq("quiz_id", quizId),
      ]);
      if (errA) throw errA;
      if (errB) throw errB;

      await supabase
        .from("live_quizzes")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", quizId);
    } catch (err: unknown) {
      console.error("Move question error:", err);
      toast.error("ไม่สามารถสลับลำดับคำถามได้: " + getErrorMessage(err));
      await fetchQuizData(); // Rollback to server state
    }
  };

  if (loading || authStatus === "loading") {
    return (
      <PageContainer className="max-w-4xl">
        <LoadingState label="กำลังโหลดชุดควิซ..." className="min-h-[50vh] flex-col" />
      </PageContainer>
    );
  }

  if (notFound || !quiz) {
    return (
      <PageContainer className="max-w-4xl">
        <EmptyState
          icon={<CircleAlertIcon />}
          title="ไม่พบชุดควิซนี้"
          description="ชุดควิซที่คุณต้องการเข้าถึงไม่มีอยู่ หรือคุณไม่มีสิทธิ์เข้าถึง (ชุดควิซเป็นของผู้สอนท่านอื่น)"
          action={
            <Button asChild>
              <Link href="/i/live/quizzes">
                <ArrowLeftIcon />
                กลับหน้ารายการชุดควิซ
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // Quiz readiness validation
  const validation = validateQuiz(questions);
  const problemsByIndex: Record<number, QuizProblem[]> = {};
  validation.problems.forEach((p) => {
    if (p.index >= 0) {
      if (!problemsByIndex[p.index]) problemsByIndex[p.index] = [];
      problemsByIndex[p.index].push(p);
    }
  });

  return (
    <PageContainer className="max-w-4xl">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <FormField label="ชื่อชุดควิซ" htmlFor="quiz-title-input" className="min-w-0 flex-1">
            <Input
              id="quiz-title-input"
              value={title}
              onChange={handleTitleChange}
              placeholder="ตั้งชื่อชุดควิซ..."
              className="h-11 text-xl font-bold md:text-xl"
            />
          </FormField>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs" aria-live="polite">
              {titleSaveStatus === "saving" && (
                <span className="flex items-center gap-1 text-primary">
                  <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                  กำลังบันทึกชื่อ...
                </span>
              )}
              {titleSaveStatus === "saved" && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckIcon className="size-3.5 text-success" aria-hidden />
                  บันทึกแล้ว
                </span>
              )}
              {titleSaveStatus === "error" && (
                <span className="flex items-center gap-1 font-medium text-destructive">
                  <CircleAlertIcon className="size-3.5" aria-hidden />
                  บันทึกชื่อไม่สำเร็จ
                </span>
              )}
            </div>

            <Button asChild variant="outline" size="sm">
              <Link href="/i/live/quizzes">เสร็จสิ้น</Link>
            </Button>
          </div>
        </div>

        <Alert
          aria-label="สถานะความพร้อมของชุดควิซ"
          className={cn(
            "flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center",
            validation.ok ? "border-success/30 bg-success-soft text-success" : "border-warning/30 bg-warning-soft text-warning",
          )}
        >
          <div className="flex items-center gap-2.5">
            {validation.ok ? <CheckIcon className="size-5" aria-hidden /> : <TriangleAlertIcon className="size-5" aria-hidden />}
            <div>
              <AlertTitle className="font-semibold">
                {validation.ok
                  ? `พร้อมเปิดห้องควิซ (${questions.length} ข้อ)`
                  : `ยังไม่พร้อมเปิดห้อง (${questions.length} ข้อ)`}
              </AlertTitle>
              <AlertDescription className="text-current opacity-90">
                {validation.ok
                  ? "คำถามและตัวเลือกครบถ้วน สามารถนำไปเปิดห้องเรียนสดได้ทันที"
                  : questions.length === 0
                  ? "ต้องมีคำถามอย่างน้อย 1 ข้อในชุดควิซ"
                  : `มี ${validation.problems.length} จุดที่ต้องแก้ไขให้สมบูรณ์ (ตรวจดูข้อความคำถาม, ตัวเลือก และคำตอบที่ถูกต้อง)`}
              </AlertDescription>
            </div>
          </div>

          <Button size="sm" className="shrink-0" onClick={handleAddQuestion} disabled={addingQuestion}>
            <PlusIcon />
            เพิ่มคำถาม
          </Button>
        </Alert>
      </header>

      <div className="flex flex-col gap-4">
        {questions.length === 0 ? (
          <EmptyState
            icon={<CircleHelpIcon />}
            title="ยังไม่มีคำถามในชุดควิซนี้"
            description="เริ่มต้นสร้างคำถามข้อแรก เพื่อให้นักศึกษาได้ร่วมสนุกและตอบคำถามแบบเรียลไทม์"
            action={
              <Button onClick={handleAddQuestion} disabled={addingQuestion}>
                <PlusIcon />
                เพิ่มคำถามข้อแรก
              </Button>
            }
          />
        ) : (
          questions.map((q, index) => (
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
          ))
        )}
      </div>

      {questions.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button onClick={handleAddQuestion} disabled={addingQuestion}>
            <PlusIcon />
            เพิ่มคำถามข้อถัดไป
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
