"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validateQuiz } from "@/lib/live";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";

export default function InstructorLiveQuizzesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;

  const [quizzes, setQuizzes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);

  const fetchQuizzes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("live_quizzes")
        .select(`
          id,
          title,
          created_at,
          updated_at,
          live_quiz_questions (
            id,
            no,
            text,
            choices,
            answer,
            time_limit_sec
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((q) => {
        const questions = (q.live_quiz_questions || []).slice().sort((a, b) => a.no - b.no);
        const validation = validateQuiz(questions);
        return {
          ...q,
          questions,
          validation,
        };
      });

      setQuizzes(formatted);
    } catch (err) {
      console.error("Error fetching live quizzes:", err);
      toast("เกิดข้อผิดพลาดในการโหลดชุดควิซ: " + (err.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchQuizzes();
  }, [user, status, fetchQuizzes]);

  const handleCreate = async () => {
    if (!user?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from("live_quizzes")
        .insert([{ title: "ชุดควิซใหม่", owner_id: user.id }])
        .select("id")
        .single();

      if (error) throw error;

      toast("สร้างชุดควิซใหม่แล้ว", "success");
      router.push(`/i/live/quizzes/${data.id}`);
    } catch (err) {
      console.error("Error creating quiz:", err);
      toast("ไม่สามารถสร้างชุดควิซได้: " + (err.message || ""), "error");
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (quiz) => {
    if (!user?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const { data: newQuiz, error: insertError } = await supabase
        .from("live_quizzes")
        .insert([
          {
            title: `${quiz.title} (สำเนา)`,
            owner_id: user.id,
          },
        ])
        .select("id")
        .single();

      if (insertError) throw insertError;

      const questions = quiz.questions || [];
      if (questions.length > 0) {
        const toInsert = questions.map((q) => ({
          quiz_id: newQuiz.id,
          no: q.no,
          text: q.text,
          choices: q.choices,
          answer: q.answer,
          time_limit_sec: q.time_limit_sec,
        }));

        const { error: qError } = await supabase
          .from("live_quiz_questions")
          .insert(toInsert);

        if (qError) throw qError;
      }

      toast("คัดลอกชุดควิซสำเร็จ", "success");
      await fetchQuizzes();
    } catch (err) {
      console.error("Error duplicating quiz:", err);
      toast("ไม่สามารถคัดลอกชุดควิซได้: " + (err.message || ""), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!quizToDelete || actionLoading) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("live_quizzes")
        .delete()
        .eq("id", quizToDelete.id);

      if (error) throw error;

      toast("ลบชุดควิซสำเร็จ", "success");
      setQuizToDelete(null);
      await fetchQuizzes();
    } catch (err) {
      console.error("Error deleting quiz:", err);
      toast("ไม่สามารถลบชุดควิซได้: " + (err.message || ""), "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || status === "loading") {
    return <Loading className="container p-5 text-center muted" />;
  }

  return (
    <div className="container">
      {/* Header section */}
      <div className="flex wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="t-2xl fw-7 fg mb-1">ควิซสด</h1>
          <p className="t-sm muted">
            จัดการชุดคำถามสำหรับเปิดห้องแข่งขันสดในห้องเรียน
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={actionLoading}
          >
            <Icon name={actionLoading ? "loader" : "plus"} size={16} className={actionLoading ? "spin" : ""} />
            <span>สร้างชุดควิซ</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {quizzes && quizzes.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="ec">
              <Icon name="help" size={26} />
            </div>
            <div className="t-lg fw-6 fg">ยังไม่มีชุดควิซ</div>
            <p className="t-sm muted pretty" style={{ maxWidth: 420, margin: 0 }}>
              สร้างชุดควิซใหม่เพื่อเริ่มเพิ่มคำถาม ตัวเลือก และกำหนดเวลาสำหรับการเปิดห้องแข่งขันสด
            </p>
            <button
              type="button"
              className="btn btn-primary mt-2"
              onClick={handleCreate}
              disabled={actionLoading}
            >
              <Icon name={actionLoading ? "loader" : "plus"} size={16} className={actionLoading ? "spin" : ""} />
              <span>สร้างชุดควิซใหม่</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex col gap-3">
          {quizzes?.map((quiz) => {
            const isReady = quiz.validation?.ok;
            const notReadyReason = quiz.validation?.problems?.[0]?.reason;
            const questionCount = quiz.questions?.length || 0;

            return (
              <div
                key={quiz.id}
                className="card card-p flex wrap items-center justify-between gap-4"
              >
                {/* Quiz Info */}
                <div className="flex-1" style={{ minWidth: 260 }}>
                  <div className="flex wrap items-center gap-2 mb-2">
                    <h2 className="t-base fw-6 fg truncate" style={{ margin: 0 }}>
                      {quiz.title}
                    </h2>
                    {isReady ? (
                      <span className="badge badge-success">
                        <Icon name="check" size={12} />
                        พร้อม
                      </span>
                    ) : (
                      <span
                        className="badge badge-warning"
                        title={notReadyReason}
                      >
                        <Icon name="alert" size={12} />
                        ยังไม่พร้อม{notReadyReason ? `: ${notReadyReason}` : ""}
                      </span>
                    )}
                  </div>

                  <div className="flex wrap items-center gap-3 t-xs muted">
                    <span className="flex items-center gap-1">
                      <Icon name="list" size={13} />
                      {questionCount} คำถาม
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="clock" size={13} />
                      แก้ไขเมื่อ {new Date(quiz.updated_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex wrap items-center gap-2">
                  {isReady && (
                    <Link
                      href={`/i/live?quiz=${quiz.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      <Icon name="play" size={14} />
                      <span>เปิดห้อง</span>
                    </Link>
                  )}

                  <Link
                    href={`/i/live/quizzes/${quiz.id}`}
                    className="btn btn-outline btn-sm"
                  >
                    <Icon name="edit" size={14} />
                    <span>แก้ไข</span>
                  </Link>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDuplicate(quiz)}
                    disabled={actionLoading}
                    title="คัดลอกชุดควิซนี้"
                  >
                    <Icon name="copy" size={14} />
                    <span>คัดลอก</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm c-danger"
                    onClick={() => setQuizToDelete(quiz)}
                    disabled={actionLoading}
                    title="ลบชุดควิซ"
                  >
                    <Icon name="trash" size={14} />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {quizToDelete && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !actionLoading && setQuizToDelete(null)}
        >
          <div
            className="dialog card-p"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="trash" size={20} />
              </div>
              <h3 className="t-lg fw-6 fg" style={{ margin: 0 }}>ยืนยันการลบชุดควิซ</h3>
            </div>

            <p className="t-sm muted lead mb-6" style={{ margin: "0 0 24px" }}>
              คุณต้องการลบชุดควิซ <span className="fw-6 fg">“{quizToDelete.title}”</span> ใช่หรือไม่? คำถามทั้งหมดในชุดนี้จะถูกลบด้วยและไม่สามารถกู้คืนได้
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setQuizToDelete(null)}
                disabled={actionLoading}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={actionLoading}
              >
                <Icon name={actionLoading ? "loader" : "trash"} size={15} className={actionLoading ? "spin" : ""} />
                <span>ลบชุดควิซ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
