"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2Icon, LibraryBigIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { validateQuiz } from "@/lib/live";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/states";
import { useConfirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const confirm = useConfirm();
  const { data: session, status } = useSession();
  const user = session?.user;
  const userId = user?.id;

  const [quizzes, setQuizzes] = useState<FormattedLiveQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

      toast.success("สร้างชุดควิซใหม่แล้ว");
      router.push(`/i/live/quizzes/${data.id}`);
    } catch (err: unknown) {
      console.error("Error creating quiz:", err);
      toast.error("ไม่สามารถสร้างชุดควิซได้: " + getErrorMessage(err));
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

  const handleDelete = useCallback(async (quiz: FormattedLiveQuiz) => {
    if (actionLoading) return;
    const ok = await confirm({
      danger: true,
      title: "ยืนยันการลบชุดควิซ",
      message: `คุณต้องการลบชุดควิซ “${quiz.title}” ใช่หรือไม่? คำถามทั้งหมดในชุดนี้จะถูกลบด้วยและไม่สามารถกู้คืนได้`,
      confirmText: "ลบชุดควิซ",
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("live_quizzes")
        .delete()
        .eq("id", quiz.id);

      if (error) throw error;

      toast.success("ลบชุดควิซสำเร็จ");
      await fetchQuizzes();
    } catch (err: unknown) {
      console.error("Error deleting quiz:", err);
      toast.error("ไม่สามารถลบชุดควิซได้: " + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, confirm, fetchQuizzes]);

  const columns = useMemo(() => quizColumns(handleDuplicate, handleDelete, actionLoading), [handleDuplicate, handleDelete, actionLoading]);

  const createButton = (
    <Button onClick={handleCreate} disabled={actionLoading}>
      {actionLoading ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
      สร้างชุดควิซ
    </Button>
  );

  return (
    <PageContainer>
      <PageHeader title="ควิซสด" description="จัดการชุดคำถามสำหรับเปิดห้องแข่งขันสดในห้องเรียน" />
      <DataTable.Root data={quizzes} columns={columns} getRowId={(r: FormattedLiveQuiz) => r.id} searchKeys={["title"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อชุดควิซ" />
          <DataTable.Actions>{createButton}</DataTable.Actions>
        </DataTable.Toolbar>
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
    </PageContainer>
  );
}
