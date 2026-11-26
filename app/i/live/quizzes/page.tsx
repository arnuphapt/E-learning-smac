"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { CircleCheckIcon, LibraryBigIcon, ListChecksIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { StatCards } from "@/components/common/stat-cards";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { validateQuiz } from "@/lib/live";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/states";
import { useConfirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { QuizDialog } from "@/components/live/create-quiz-dialog";
import { createQuizWithQuestions, saveQuizEdits, type QuizQuestionDraftItem } from "@/components/live/quiz-draft";
import { quizColumns, type FormattedLiveQuiz } from "@/components/live/quiz-columns";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "";
  }
  return "";
}

export default function InstructorLiveQuizzesPage() {
  const confirm = useConfirm();
  const { data: session, status } = useSession();
  const user = session?.user;
  const userId = user?.id;

  const [quizzes, setQuizzes] = useState<FormattedLiveQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [quizDialog, setQuizDialog] = useState<{ mode: "create" } | { mode: "edit"; quizId: string } | null>(null);

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
            time_limit_sec,
            points
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formatted: FormattedLiveQuiz[] = (data || []).map((q) => {
        const questions = (q.live_quiz_questions || []).slice().sort((a, b) => a.no - b.no);
        const validation = validateQuiz(questions);
        return {
          ...q,
          questions,
          validation,
        };
      });

      setQuizzes(formatted);
    } catch (err: unknown) {
      console.error("Error fetching live quizzes:", err);
      toast.error("เกิดข้อผิดพลาดในการโหลดชุดควิซ: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (status === "loading") return;
    if (!user) return;
    fetchQuizzes();
  }, [user, status, fetchQuizzes]);

  const handleSaveQuiz = async ({
    title,
    questions,
    initialIds,
  }: {
    title: string;
    questions: QuizQuestionDraftItem[];
    initialIds: Set<string>;
  }) => {
    if (!user?.id || actionLoading || !quizDialog) return;
    setActionLoading(true);
    try {
      if (quizDialog.mode === "edit") {
        await saveQuizEdits({ quizId: quizDialog.quizId, title, questions, initialIds });
        toast.success("บันทึกชุดควิซแล้ว");
      } else {
        await createQuizWithQuestions({ title, ownerId: user.id, questions });
        toast.success("สร้างชุดควิซใหม่แล้ว");
      }
      setQuizDialog(null);
      await fetchQuizzes();
    } catch (err: unknown) {
      console.error("Error saving quiz:", err);
      toast.error(
        (quizDialog.mode === "edit" ? "ไม่สามารถบันทึกชุดควิซได้: " : "ไม่สามารถสร้างชุดควิซได้: ") +
          getErrorMessage(err),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = useCallback(async (quiz: FormattedLiveQuiz) => {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    try {
      const { data: newQuiz, error: insertError } = await supabase
        .from("live_quizzes")
        .insert([
          {
            title: `${quiz.title} (สำเนา)`,
            owner_id: userId,
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
          points: q.points,
        }));

        const { error: qError } = await supabase
          .from("live_quiz_questions")
          .insert(toInsert);

        if (qError) throw qError;
      }

      toast.success("คัดลอกชุดควิซสำเร็จ");
      await fetchQuizzes();
    } catch (err: unknown) {
      console.error("Error duplicating quiz:", err);
      toast.error("ไม่สามารถคัดลอกชุดควิซได้: " + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [userId, actionLoading, fetchQuizzes]);

  // One or many: the row's ลบ passes one quiz, the bulk bar passes the selection. Questions go with the quiz (FK cascade).
  const deleteQuizzes = useCallback(async (list: FormattedLiveQuiz[]) => {
    if (actionLoading || list.length === 0) return false;
    const ok = await confirm({
      danger: true,
      title: list.length > 1 ? "ยืนยันการลบชุดควิซที่เลือก" : "ยืนยันการลบชุดควิซ",
      message: list.length > 1
        ? `คุณต้องการลบชุดควิซ ${list.length} ชุดใช่หรือไม่? คำถามทั้งหมดในชุดเหล่านี้จะถูกลบด้วยและไม่สามารถกู้คืนได้`
        : `คุณต้องการลบชุดควิซ “${list[0].title}” ใช่หรือไม่? คำถามทั้งหมดในชุดนี้จะถูกลบด้วยและไม่สามารถกู้คืนได้`,
      confirmText: list.length > 1 ? `ลบ ${list.length} ชุด` : "ลบชุดควิซ",
    });
    if (!ok) return false;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("live_quizzes")
        .delete()
        .in("id", list.map((q) => q.id));

      if (error) throw error;

      toast.success(list.length > 1 ? `ลบชุดควิซ ${list.length} ชุดสำเร็จ` : "ลบชุดควิซสำเร็จ");
      await fetchQuizzes();
      return true;
    } catch (err: unknown) {
      console.error("Error deleting quiz:", err);
      toast.error("ไม่สามารถลบชุดควิซได้: " + getErrorMessage(err));
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, confirm, fetchQuizzes]);

  const columns = useMemo(
    () => quizColumns((q) => setQuizDialog({ mode: "edit", quizId: q.id }), handleDuplicate, (q) => void deleteQuizzes([q]), actionLoading),
    [handleDuplicate, deleteQuizzes, actionLoading],
  );
  const readyCount = quizzes.filter((q) => q.validation?.ok).length;

  return (
    <PageContainer>
      <PageHeader
        title="ควิซสด"
        description="จัดการชุดคำถามสำหรับเปิดห้องแข่งขันสดในห้องเรียน"
        actions={
          <Button onClick={() => setQuizDialog({ mode: "create" })} disabled={actionLoading}>
            <PlusIcon />
            สร้างชุดควิซ
          </Button>
        }
      />
      <StatCards
        stats={[
          { label: "ชุดควิซทั้งหมด", value: quizzes.length, icon: <LibraryBigIcon /> },
          { label: "พร้อมเปิดห้อง", value: readyCount, icon: <CircleCheckIcon />, tone: "success" },
          { label: "ยังไม่พร้อม", value: quizzes.length - readyCount, icon: <TriangleAlertIcon />, tone: "warning" },
          { label: "คำถามรวม", value: quizzes.reduce((n, q) => n + q.questions.length, 0), icon: <ListChecksIcon /> },
        ]}
      />
      <DataTable.Root data={quizzes} columns={columns} getRowId={(r: FormattedLiveQuiz) => r.id} searchKeys={["title"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อชุดควิซ" />
        </DataTable.Toolbar>
        <DataTable.BulkBar<FormattedLiveQuiz>>
          {({ rows, clear }) => (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={actionLoading}
              onClick={async () => {
                if (await deleteQuizzes(rows)) clear();
              }}
            >
              <Trash2Icon />
              ลบที่เลือก
            </Button>
          )}
        </DataTable.BulkBar>
        <DataTable.Content
          loading={(loading && !!user) || status === "loading"}
          empty={
            <EmptyState
              icon={<LibraryBigIcon />}
              title="ยังไม่มีชุดควิซ"
              description="สร้างชุดควิซใหม่เพื่อเริ่มเพิ่มคำถาม ตัวเลือก และกำหนดเวลาสำหรับการเปิดห้องแข่งขันสด"
            />
          }
        />
        <DataTable.Pagination />
      </DataTable.Root>
      {quizDialog && (
        <QuizDialog
          quizId={quizDialog.mode === "edit" ? quizDialog.quizId : null}
          onClose={() => setQuizDialog(null)}
          onSave={handleSaveQuiz}
          loading={actionLoading}
        />
      )}
    </PageContainer>
  );
}
