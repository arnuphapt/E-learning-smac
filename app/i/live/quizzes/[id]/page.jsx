"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validateQuiz } from "@/lib/live";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import QuizQuestionEditor from "@/components/live/QuizQuestionEditor";

export default function QuizEditorPage(props) {
  const router = useRouter();
  const routeParams = useParams();
  const resolvedParams =
    props?.params && typeof props.params.then === "function"
      ? React.use(props.params)
      : props?.params || routeParams;
  const quizId = resolvedParams?.id || routeParams?.id;

  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Title state & autosave
  const [title, setTitle] = useState("");
  const [titleSaveStatus, setTitleSaveStatus] = useState("saved"); // 'saving' | 'saved' | 'error'
  const titleDebounceRef = useRef(null);
  const pendingTitleRef = useRef(null);
  const titleSavingRef = useRef(null);
  const mountedRef = useRef(false);

  // Action states
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(null); // question object to confirm delete

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
        .select("id, quiz_id, no, text, choices, answer, time_limit_sec")
        .eq("quiz_id", quizId)
        .order("no", { ascending: true });

      if (questionsError) throw questionsError;

      setQuestions(questionsData || []);
      setNotFound(false);
    } catch (err) {
      console.error("Error loading quiz:", err);
      toast("เกิดข้อผิดพลาดในการโหลดชุดควิซ: " + (err.message || ""), "error");
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
    clearTimeout(titleDebounceRef.current);
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
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setTitleSaveStatus("saving");
    pendingTitleRef.current = { quizId, title: newTitle };
    clearTimeout(titleDebounceRef.current);
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
    async (updatedQ) => {
      try {
        const fields = {
          text: updatedQ.text,
          choices: updatedQ.choices,
          answer: updatedQ.answer,
          time_limit_sec: updatedQ.time_limit_sec,
        };
        const { error } = await supabase
          .from("live_quiz_questions")
          .update(fields)
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

      setQuestions((prev) => [...prev, data]);
      toast(`เพิ่มข้อที่ ${nextNo} แล้ว`, "success");
    } catch (err) {
      console.error("Add question error:", err);
      toast("ไม่สามารถเพิ่มคำถามได้: " + (err.message || ""), "error");
    } finally {
      setAddingQuestion(false);
    }
  };

  // Delete question confirmation & execution
  const executeDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    const targetQ = deletingQuestion;
    setDeletingQuestion(null);

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
      toast(`ลบข้อที่ ${targetQ.no} แล้ว`, "success");
    } catch (err) {
      console.error("Delete question error:", err);
      toast("ไม่สามารถลบคำถามได้: " + (err.message || ""), "error");
    }
  };

  // Move question up or down
  const handleMoveQuestion = async (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= questions.length || fromIndex === toIndex) return;

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
    } catch (err) {
      console.error("Move question error:", err);
      toast("ไม่สามารถสลับลำดับคำถามได้: " + (err.message || ""), "error");
      await fetchQuizData(); // Rollback to server state
    }
  };

  if (loading || authStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loading />
        <p className="text-sm text-muted-foreground">กำลังโหลดชุดควิซ...</p>
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--muted)", color: "var(--subtle)" }}>
          <Icon name="alert-circle" className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          ไม่พบชุดควิซนี้
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          ชุดควิซที่คุณต้องการเข้าถึงไม่มีอยู่ หรือคุณไม่มีสิทธิ์เข้าถึง (ชุดควิซเป็นของผู้สอนท่านอื่น)
        </p>
        <Link
          href="/i/live/quizzes"
          className="btn btn-primary"
        >
          <Icon name="arrow-left" className="w-4 h-4" />
          กลับหน้ารายการชุดควิซ
        </Link>
      </div>
    );
  }

  // Quiz readiness validation
  const validation = validateQuiz(questions);
  const problemsByIndex = {};
  validation.problems.forEach((p) => {
    if (p.index >= 0) {
      if (!problemsByIndex[p.index]) problemsByIndex[p.index] = [];
      problemsByIndex[p.index].push(p);
    }
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Breadcrumb & Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4" aria-label="Breadcrumb">
        <Link
          href="/i/live/quizzes"
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <Icon name="chevron-left" className="w-3.5 h-3.5" />
          ชุดควิซทั้งหมด
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-xs">
          {title || "ชุดควิซ"}
        </span>
      </nav>

      {/* Title & Status Header */}
      <header className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <label htmlFor="quiz-title-input" className="label mb-1.5">
              ชื่อชุดควิซ
            </label>
            <input
              id="quiz-title-input"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="ตั้งชื่อชุดควิซ..."
              className="input font-bold"
              style={{ fontSize: "1.25rem", height: 44 }}
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Title autosave indicator */}
            <div className="text-xs flex items-center gap-1.5" aria-live="polite">
              {titleSaveStatus === "saving" && (
                <span className="flex items-center gap-1" style={{ color: "var(--primary)" }}>
                  <Icon name="loader" className="w-3.5 h-3.5 animate-spin" />
                  กำลังบันทึกชื่อ...
                </span>
              )}
              {titleSaveStatus === "saved" && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Icon name="check" className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                  บันทึกแล้ว
                </span>
              )}
              {titleSaveStatus === "error" && (
                <span className="font-medium flex items-center gap-1" style={{ color: "var(--danger)" }}>
                  <Icon name="alert-circle" className="w-3.5 h-3.5" />
                  บันทึกชื่อไม่สำเร็จ
                </span>
              )}
            </div>

            <Link
              href="/i/live/quizzes"
              className="btn btn-outline btn-sm"
              style={{ height: 32, minHeight: 32, padding: "0 12px", fontSize: 12.5 }}
            >
              เสร็จสิ้น
            </Link>
          </div>
        </div>

        {/* Readiness Banner */}
        <section
          aria-label="สถานะความพร้อมของชุดควิซ"
          className="p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            background: validation.ok ? "var(--success-soft)" : "var(--warning-soft)",
            borderColor: validation.ok ? "rgba(31,122,77,.3)" : "rgba(138,82,18,.3)",
            color: validation.ok ? "var(--success)" : "var(--warning)",
          }}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <div
              className="p-1.5 rounded-lg shrink-0"
              style={{
                background: "#fff",
                color: validation.ok ? "var(--success)" : "var(--warning)",
              }}
            >
              <Icon name={validation.ok ? "check" : "alert-triangle"} className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {validation.ok
                  ? `พร้อมเปิดห้องควิซ (${questions.length} ข้อ)`
                  : `ยังไม่พร้อมเปิดห้อง (${questions.length} ข้อ)`}
              </p>
              <p className="text-xs opacity-90">
                {validation.ok
                  ? "คำถามและตัวเลือกครบถ้วน สามารถนำไปเปิดห้องเรียนสดได้ทันที"
                  : questions.length === 0
                  ? "ต้องมีคำถามอย่างน้อย 1 ข้อในชุดควิซ"
                  : `มี ${validation.problems.length} จุดที่ต้องแก้ไขให้สมบูรณ์ (ตรวจดูข้อความคำถาม, ตัวเลือก และคำตอบที่ถูกต้อง)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddQuestion}
            disabled={addingQuestion}
            className="btn btn-primary btn-sm shrink-0"
          >
            <Icon name="plus" className="w-4 h-4" />
            เพิ่มคำถาม
          </button>
        </section>
      </header>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="card empty p-12">
            <div className="ec mb-3">
              <Icon name="help-circle" className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              ยังไม่มีคำถามในชุดควิซนี้
            </h3>
            <p className="t-xs muted max-w-sm mx-auto mb-4">
              เริ่มต้นสร้างคำถามข้อแรก เพื่อให้นักศึกษาได้ร่วมสนุกและตอบคำถามแบบเรียลไทม์
            </p>
            <button
              type="button"
              onClick={handleAddQuestion}
              disabled={addingQuestion}
              className="btn btn-primary"
            >
              <Icon name="plus" className="w-4 h-4" />
              เพิ่มคำถามข้อแรก
            </button>
          </div>
        ) : (
          questions.map((q, index) => (
            <QuizQuestionEditor
              key={q.id}
              question={q}
              index={index}
              total={questions.length}
              problems={problemsByIndex[index] || []}
              onSaveQuestion={handleSaveQuestion}
              onDeleteQuestion={(questionToDelete) => setDeletingQuestion(questionToDelete)}
              onMoveQuestion={handleMoveQuestion}
            />
          ))
        )}
      </div>

      {/* Bottom Floating/Fixed Add Button */}
      {questions.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleAddQuestion}
            disabled={addingQuestion}
            className="btn btn-primary"
          >
            <Icon name="plus" className="w-4 h-4" />
            เพิ่มคำถามข้อถัดไป
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingQuestion && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => setDeletingQuestion(null)}
        >
          <div
            className="card max-w-sm w-full p-5 shadow-xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3" style={{ color: "var(--danger)" }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                <Icon name="trash" className="w-5 h-5" />
              </div>
              <h3 id="delete-dialog-title" className="font-bold text-base text-foreground">
                ยืนยันการลบคำถาม
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              คุณต้องการลบคำถามข้อที่ {deletingQuestion.no} หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="btn btn-outline btn-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeDeleteQuestion}
                className="btn btn-danger btn-sm"
                style={{
                  background: "var(--danger)",
                  color: "#fff",
                  borderColor: "transparent",
                }}
              >
                ลบคำถาม
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
