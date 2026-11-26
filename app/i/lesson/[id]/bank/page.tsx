"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftIcon, FileSpreadsheetIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { normalizeTopic, findTopic, bankWarning, parseDrawCount } from "@/lib/tutor-bank"
import type { Database, Json } from "@/lib/database.types"
import type { ImportedQuestionRow } from "@/lib/tutor-import"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, LoadingState } from "@/components/common/states"
import { useConfirm } from "@/components/common/confirm"
import { Button } from "@/components/ui/button"
import { BankImport } from "@/components/tutor/bank-import"
import { BankDrawCard } from "@/components/tutor/bank-draw-card"
import { BankTable } from "@/components/tutor/bank-table"
import { parseBankChoices } from "@/components/tutor/bank-question-card"
import { BankQuestionDialog, blankQuestion, type QuestionForm } from "@/components/tutor/bank-question-dialog"

type LessonRow = Database["public"]["Tables"]["lessons"]["Row"]
type CourseAllRow = Database["public"]["Tables"]["courses_all"]["Row"]
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"]
type TutorTopicRow = Database["public"]["Tables"]["tutor_topics"]["Row"]

interface BankState {
  loading: boolean
  lesson: LessonRow | null
  course: CourseAllRow | null
  questions: QuestionRow[]
  topics: TutorTopicRow[]
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export default function TutorBank() {
  const router = useRouter()
  const nav = (path: string) => router.push(path)
  const confirm = useConfirm()
  const rawId = useParams()?.id
  const lessonId = Array.isArray(rawId) ? rawId[0] : rawId

  const [state, setState] = useState<BankState>({ loading: true, lesson: null, course: null, questions: [], topics: [] })
  const [editing, setEditing] = useState<QuestionForm | null>(null)
  const [importing, setImporting] = useState(false)
  const [whole, setWhole] = useState(true)
  const [drawInput, setDrawInput] = useState("")

  const fetchAll = useCallback(async () => {
    if (!lessonId) return { questions: [], topics: [] };
    const [qRes, tRes] = await Promise.all([
      supabase.from("questions").select("*").eq("lesson_id", lessonId).eq("kind", "tutor").order("no", { ascending: true }),
      supabase.from("tutor_topics").select("*").eq("lesson_id", lessonId).order("created_at", { ascending: true }),
    ]);
    if (qRes.error || tRes.error) throw qRes.error || tRes.error;
    return { questions: qRes.data || [], topics: tRes.data || [] };
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    (async () => {
      // the bank does not depend on the lesson row, so load both at once; the course needs lesson.course_id
      const [{ data: lesson }, rest] = await Promise.all([
        supabase.from("lessons").select("*").eq("id", lessonId).single(),
        fetchAll(),
      ]);
      if (!lesson) { if (!cancelled) setState((s) => ({ ...s, loading: false })); return; }
      // courses_all, not the `courses` view: the view hides tutor sets.
      const { data: course } = lesson.course_id
        ? await supabase.from("courses_all").select("*").eq("id", lesson.course_id).single()
        : { data: null };
      if (cancelled) return;
      setState({ loading: false, lesson, course, ...rest });
      setWhole(lesson.tutor_draw_count == null);
      setDrawInput(lesson.tutor_draw_count == null ? "" : String(lesson.tutor_draw_count));
    })().catch((e: unknown) => { toast.error("โหลดข้อมูลไม่สำเร็จ: " + errMsg(e)); setState((s) => ({ ...s, loading: false })); });
    return () => { cancelled = true; };
  }, [lessonId, fetchAll]);

  // Reload the bank, drop topics no question uses any more, so "lesson has topics" stays true only for real topics.
  const refresh = async () => {
    let rest = await fetchAll();
    const used = new Set(rest.questions.map((q) => q.topic_id).filter((id): id is string => Boolean(id)));
    const unused = rest.topics.filter((t) => !used.has(t.id)).map((t) => t.id);
    if (unused.length) {
      const { error } = await supabase.from("tutor_topics").delete().in("id", unused);
      if (!error) rest = { ...rest, topics: rest.topics.filter((t) => used.has(t.id)) };
    }
    setState((s) => ({ ...s, ...rest }));
  };

  const topicIdFor = async (name: string, topics: Array<Pick<TutorTopicRow, "id" | "name">>) => {
    const n = normalizeTopic(name);
    if (!n || !lessonId) return null;
    const hit = findTopic(topics, n);
    if (hit) return hit.id;
    const id = "tt_" + Date.now() + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("tutor_topics").insert([{ id, lesson_id: lessonId, name: n }]);
    if (!error) return id;
    // lost a race / stale list: the name already exists, use that row
    const { data } = await supabase.from("tutor_topics").select("*").eq("lesson_id", lessonId);
    const again = findTopic(data || [], n);
    if (again) return again.id;
    throw error;
  };

  const saveQuestion = async (q: QuestionForm) => {
    if (!lessonId) return;
    try {
      const topic_id = await topicIdFor(q.topicName, state.topics);
      const row = {
        type: "single",
        text: q.text,
        choices: q.choices as unknown as Json,
        answer: q.answer,
        explanation: q.explanation || null,
        topic_id,
        lesson_id: lessonId,
        kind: "tutor",
      };
      const { error } = q.id
        ? await supabase.from("questions").update(row).eq("id", q.id)
        : await supabase.from("questions").insert([{ ...row, id: "q_" + Date.now(), no: Math.max(0, ...state.questions.map((x) => x.no || 0)) + 1 }]);
      if (error) throw error;
      toast.success(q.id ? "บันทึกข้อสอบแล้ว" : "เพิ่มข้อสอบเข้าคลังแล้ว");
      setEditing(null);
      await refresh();
    } catch (e: unknown) {
      toast.error("เกิดข้อผิดพลาด: " + errMsg(e));
    }
  };

  // Excel import: items = parsed rows ({ row, text, choices, answer, explanation, topicName }). Topics follow the editor's
  // rules (topicIdFor: trimmed case-insensitive match, else create). Questions go in chunks so a failing chunk is reported
  // by row instead of losing the rest. Returns { imported, failed: [{ row, message }] } for the dialog.
  const importQuestions = async (items: ImportedQuestionRow[]) => {
    const failed: Array<{ row: number; message: string }> = [];
    const known: Array<Pick<TutorTopicRow, "id" | "name">> = [...state.topics];
    const ids = new Map<string, string>();
    const ready: Array<{ row: number; topic_id: string | null; q: ImportedQuestionRow }> = [];
    for (const q of items) {
      const key = normalizeTopic(q.topicName).toLowerCase();
      try {
        if (key && !ids.has(key)) {
          const id = await topicIdFor(q.topicName, known);
          if (id) {
            known.push({ id, name: normalizeTopic(q.topicName) });
            ids.set(key, id);
          }
        }
        ready.push({ row: q.row, topic_id: key ? (ids.get(key) ?? null) : null, q });
      } catch (e: unknown) {
        failed.push({ row: q.row, message: "สร้างหัวข้อไม่สำเร็จ: " + errMsg(e) });
      }
    }
    const stamp = Date.now();
    const firstNo = Math.max(0, ...state.questions.map((x) => x.no || 0)) + 1;
    let imported = 0;
    for (let i = 0; i < ready.length; i += 50) {
      const chunk = ready.slice(i, i + 50);
      const { error } = await supabase.from("questions").insert(chunk.map(({ q, topic_id }, j) => ({
        id: `q_${stamp}_${i + j}`,
        no: firstNo + i + j,
        type: "single",
        text: q.text,
        choices: q.choices as unknown as Json,
        answer: q.answer,
        explanation: q.explanation || null,
        topic_id,
        lesson_id: lessonId,
        kind: "tutor",
      })));
      if (error) failed.push(...chunk.map((c) => ({ row: c.row, message: error.message })));
      else imported += chunk.length;
    }
    failed.sort((a, b) => a.row - b.row);
    if (failed.length) toast.error(`นำเข้าสำเร็จ ${imported} ข้อ ไม่สำเร็จ ${failed.length} ข้อ (แถว ${failed.map((f) => f.row).join(", ")})`);
    else toast.success(`นำเข้าข้อสอบ ${imported} ข้อแล้ว`);
    await refresh().catch((e: unknown) => toast.error("โหลดคลังไม่สำเร็จ: " + errMsg(e)));
    return { imported, failed };
  };

  // One or many (row ลบ passes one, the bulk bar passes the selection); refresh() also drops topics left with no question.
  const deleteQuestions = async (qs: QuestionRow[]) => {
    const ok = await confirm({
      title: qs.length > 1 ? "ลบข้อสอบที่เลือก" : "ลบข้อสอบ",
      message: qs.length > 1 ? `ลบข้อสอบ ${qs.length} ข้อออกจากคลังใช่หรือไม่?` : "ลบข้อสอบนี้ออกจากคลังใช่หรือไม่?",
      danger: true,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return false;
    const { error } = await supabase.from("questions").delete().in("id", qs.map((q) => q.id));
    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return false;
    }
    toast.success(qs.length > 1 ? `ลบข้อสอบ ${qs.length} ข้อเรียบร้อยแล้ว` : "ลบข้อสอบเรียบร้อยแล้ว");
    await refresh().catch((e: unknown) => toast.error("โหลดคลังไม่สำเร็จ: " + errMsg(e)));
    return true;
  };

  // Bulk "ย้ายหัวข้อ": point the selected questions at an existing topic (same topic_id the editor would set).
  const moveTopic = async (qs: QuestionRow[], topicId: string | null) => {
    const { error } = await supabase.from("questions").update({ topic_id: topicId }).in("id", qs.map((q) => q.id));
    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return false;
    }
    toast.success(`ย้ายข้อสอบ ${qs.length} ข้อไปหัวข้อใหม่แล้ว`);
    await refresh().catch((e: unknown) => toast.error("โหลดคลังไม่สำเร็จ: " + errMsg(e)));
    return true;
  };

  const saveDraw = async () => {
    if (!lessonId) return;
    const value = whole ? null : parseDrawCount(drawInput);
    // unchecking "ใช้ทั้งคลัง" needs a real number: blank/invalid must not silently save NULL (= whole bank)
    if (!whole && !value) return toast.error("กรุณากรอกจำนวนข้อต่อรอบเป็นเลขจำนวนเต็มมากกว่า 0 หรือเลือก \"ใช้ทั้งคลัง\"");
    const { error } = await supabase.from("lessons").update({ tutor_draw_count: value }).eq("id", lessonId);
    if (error) return toast.error("เกิดข้อผิดพลาด: " + error.message);
    setState((s) => ({ ...s, lesson: s.lesson ? { ...s.lesson, tutor_draw_count: value ?? null } : null }));
    toast.success("บันทึกการตั้งค่าแล้ว");
  };

  const { loading, lesson, course, questions, topics } = state
  if (loading) return <PageContainer><LoadingState /></PageContainer>
  if (!lesson || !course) {
    return (
      <PageContainer>
        <EmptyState icon={<TriangleAlertIcon />} title="ไม่พบบทเรียน" />
      </PageContainer>
    )
  }
  if (course.kind !== "tutor") {
    return (
      <PageContainer>
        <EmptyState
          icon={<TriangleAlertIcon />}
          title="บทนี้ไม่ได้อยู่ในชุดติว"
          description="คลังข้อสอบใช้ได้เฉพาะบทของชุดติว ข้อสอบ Pre/Post ของรายวิชาจัดการที่หน้าแก้ไขบทเรียน"
          action={
            <Button variant="outline" onClick={() => nav("/i/lesson/" + lesson.id)}>
              ไปหน้าแก้ไขบทเรียน
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const topicName = (id: string | null) => topics.find((t) => t.id === id)?.name
  const draftValue = whole ? null : parseDrawCount(drawInput)
  const warning = bankWarning(questions.length, draftValue ?? null)
  const workspace = "/i/tutor/" + course.id + "?lesson=" + lesson.id

  return (
    <PageContainer>
      <PageHeader
        kicker={`คลังข้อสอบ · ${course.code}`}
        title={lesson.title}
        description={
          <>
            <span className="font-semibold text-foreground">{questions.length}</span> ข้อ · <span className="font-semibold text-foreground">{topics.length}</span> หัวข้อ
            <br />
            นักศึกษาเห็นข้อสอบผ่านหน้าทำข้อสอบของชุดติวเท่านั้น และเห็นเฉลยหลังส่งชุด
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => nav(workspace)}>
              <ArrowLeftIcon />
              กลับไปที่บทเรียน
            </Button>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileSpreadsheetIcon />
              นำเข้าจาก Excel
            </Button>
            <Button onClick={() => setEditing(blankQuestion())}>
              <PlusIcon />
              เพิ่มข้อสอบ
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <BankTable
            questions={questions}
            topics={topics}
            drawCount={lesson.tutor_draw_count ?? null}
            onAdd={() => setEditing(blankQuestion())}
            onEdit={(q) =>
              setEditing({
                id: q.id,
                text: q.text || "",
                choices: q.choices ? parseBankChoices(q.choices) : blankQuestion().choices,
                answer: q.answer || "a",
                explanation: q.explanation || "",
                topicName: topicName(q.topic_id) || "",
              })
            }
            onDelete={deleteQuestions}
            onMoveTopic={moveTopic}
          />
        </section>

        <BankDrawCard whole={whole} onWhole={setWhole} drawInput={drawInput} onDrawInput={setDrawInput} warning={warning} onSave={saveDraw} />
      </div>

      {importing && <BankImport topics={topics} onClose={() => setImporting(false)} onImport={importQuestions} />}
      {editing && <BankQuestionDialog q={editing} topics={topics} onClose={() => setEditing(null)} onSave={saveQuestion} />}
    </PageContainer>
  )
}
