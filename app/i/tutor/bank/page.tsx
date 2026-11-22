"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Database, Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { visibleTutorSets, filterBank, topicNames, type BankRowInput } from "@/lib/tutor-bank";
import RawIcon from "@/components/ui/Icon";
import RawLoading from "@/components/ui/Loading";
import { Badge as RawBadge, Select as RawSelect } from "@/components/ui/Primitives";

interface IconProps {
  name: string;
  size?: number;
  sw?: number;
  fill?: string;
  style?: React.CSSProperties;
  className?: string;
}

interface LoadingProps {
  text?: string;
  fullHeight?: boolean;
  className?: string;
}

interface BadgeProps {
  children?: React.ReactNode;
  tone?: string;
  dot?: boolean;
}

interface SelectProps {
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const Icon = RawIcon as unknown as React.ComponentType<IconProps>;
const Loading = RawLoading as unknown as React.ComponentType<LoadingProps>;
const Badge = RawBadge as unknown as React.ComponentType<BadgeProps>;
const Select = RawSelect as unknown as React.ComponentType<SelectProps>;

type QuestionSelectRow = Pick<
  Database["public"]["Tables"]["questions"]["Row"],
  "id" | "no" | "text" | "choices" | "answer" | "topic_id" | "lesson_id"
>;

type BankCourseRow = Pick<
  Database["public"]["Tables"]["courses_all"]["Row"],
  "id" | "code" | "title" | "group_id"
>;

interface BankLessonRow {
  id: string;
  course_id: string;
  index: number | null;
  title: string;
}

interface BankQuestionRow extends BankRowInput {
  id: string;
  no: number;
  text: string;
  lessonId: string;
  setId: string;
  topic: string;
  answerText: string;
}

interface ChoiceEntry {
  id?: string;
  text?: string;
}

type BankDataState =
  | { error: string; rows?: undefined; sets?: undefined; lessons?: undefined; setById?: undefined; lessonById?: undefined }
  | {
      error?: undefined;
      sets: BankCourseRow[];
      lessons: BankLessonRow[];
      rows: BankQuestionRow[];
      setById: Map<string, BankCourseRow>;
      lessonById: Map<string, BankLessonRow>;
    };

function parseChoices(raw: Json | null): ChoiceEntry[] {
  if (!Array.isArray(raw)) return [];
  const res: ChoiceEntry[] = [];
  for (const item of raw) {
    if (typeof item === "object" && item !== null) {
      const rec = item as { id?: unknown; text?: unknown };
      res.push({
        id: typeof rec.id === "string" ? rec.id : undefined,
        text: typeof rec.text === "string" ? rec.text : undefined,
      });
    }
  }
  return res;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "";
  }
  return String(err);
}

const PAGE = 50; // rows rendered at once; "แสดงเพิ่ม" adds another page

// PostgREST returns at most 1000 rows per request: read the tutor bank in pages so a big bank is not cut silently.
async function allTutorQuestions(): Promise<QuestionSelectRow[]> {
  const out: QuestionSelectRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("questions").select("id, no, text, choices, answer, topic_id, lesson_id")
      .eq("kind", "tutor").order("lesson_id").order("no").order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

// Standalone view of every tutor bank question the caller manages. Same data path and visibility rule as /i/tutor
// (RLS-backed client reads of courses_all / lessons / questions + visibleTutorSets); editing stays in /i/lesson/[id]/bank.
export default function InstructorTutorBank() {
  const { data: session } = useSession();
  const user = session?.user;
  const [data, setData] = useState<BankDataState | null>(null); // { sets, lessons, rows, setById, lessonById } or { error }
  const [setId, setSetId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const userId = user?.id;
    if (!user || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [cRes, lRes, ciRes, topicRes, questions] = await Promise.all([
          supabase.from("courses_all").select("id, code, title, group_id").eq("kind", "tutor").order("code"),
          supabase.from("lessons").select("id, course_id, index, title"),
          supabase.from("course_instructors").select("course_id").eq("user_id", userId),
          supabase.from("tutor_topics").select("id, name"),
          allTutorQuestions(),
        ]);
        const err = cRes.error || lRes.error || ciRes.error || topicRes.error;
        if (err) throw err;
        if (cancelled) return;
        const sets = visibleTutorSets(cRes.data, user, (ciRes.data || []).map((ci) => ci.course_id));
        const setById = new Map(sets.map((c) => [c.id, c]));
        const setOrder = new Map(sets.map((c, i) => [c.id, i]));
        const lessons = (lRes.data || [])
          .filter((l): l is BankLessonRow => Boolean(l.course_id && setById.has(l.course_id)))
          .sort((a, b) => (setOrder.get(a.course_id) ?? 0) - (setOrder.get(b.course_id) ?? 0) || (a.index ?? 0) - (b.index ?? 0));
        const lessonById = new Map(lessons.map((l) => [l.id, l]));
        const topicById = new Map((topicRes.data || []).map((t) => [t.id, t.name]));
        const lessonOrder = new Map(lessons.map((l, i) => [l.id, i]));
        const rows: BankQuestionRow[] = questions
          .filter((r): r is QuestionSelectRow & { lesson_id: string } => Boolean(r.lesson_id && lessonById.has(r.lesson_id)))
          .map((r) => {
            const parentLesson = lessonById.get(r.lesson_id);
            return {
              id: r.id,
              no: r.no || 0,
              text: r.text || "",
              lessonId: r.lesson_id,
              setId: parentLesson ? parentLesson.course_id : "",
              topic: (r.topic_id ? topicById.get(r.topic_id) : undefined) || "",
              answerText: parseChoices(r.choices).find((c) => c.id === r.answer)?.text || "",
            };
          })
          .sort((a, b) => (lessonOrder.get(a.lessonId) ?? 0) - (lessonOrder.get(b.lessonId) ?? 0) || a.no - b.no);
        setData({ sets, lessons, rows, setById, lessonById });
      } catch (e: unknown) {
        if (!cancelled) setData({ error: getErrorMessage(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const rows = data?.rows;
  const scoped = useMemo(() => (rows ? filterBank(rows, { setId, lessonId }) : []), [rows, setId, lessonId]);
  const topics = useMemo(() => topicNames(scoped), [scoped]);
  const shown = useMemo(() => (rows ? filterBank(rows, { setId, lessonId, topic, q }) : []), [rows, setId, lessonId, topic, q]);

  if (!data) return <Loading className="container p-5 text-center muted" />;
  if (data.error !== undefined) {
    return <div className="container p-5"><div className="card"><div className="empty">
      <div className="fw-6 fg">โหลดคลังข้อสอบไม่สำเร็จ</div><div className="t-sm muted">{data.error}</div>
    </div></div></div>;
  }

  const { sets, lessons, setById, lessonById } = data;
  const lessonOptions = lessons.filter((l) => !setId || l.course_id === setId);
  const field: React.CSSProperties = { flex: "1 1 200px", minWidth: 0 };

  return (
    <div className="container">
      <div className="tw-head">
        <div>
          <span className="tw-tag">โหมดติว</span>
          <h1>คลังข้อสอบ</h1>
          <div className="tw-stats">
            <span><b>{data.rows.length}</b>ข้อทั้งหมด</span>
            <span><b>{sets.length}</b>ชุดติว</span>
            <span><b>{lessons.length}</b>บทเรียน</span>
          </div>
        </div>
      </div>

      <div className="card card-p mb-4">
        <div className="flex gap-3 wrap">
          <div className="field" style={field}>
            <label className="label">ชุดติว</label>
            <Select value={setId} onChange={(e) => { setSetId(e.target.value); setLessonId(""); setTopic(""); setLimit(PAGE); }}>
              <option value="">ทั้งหมด</option>
              {sets.map((c) => <option key={c.id} value={c.id}>{c.code} {c.title}</option>)}
            </Select>
          </div>
          <div className="field" style={field}>
            <label className="label">บทเรียน</label>
            <Select value={lessonId} onChange={(e) => { setLessonId(e.target.value); setTopic(""); setLimit(PAGE); }}>
              <option value="">ทั้งหมด</option>
              {lessonOptions.map((l) => <option key={l.id} value={l.id}>บทที่ {l.index} {l.title}</option>)}
            </Select>
          </div>
          <div className="field" style={field}>
            <label className="label">หัวข้อ</label>
            <Select value={topic} onChange={(e) => { setTopic(e.target.value); setLimit(PAGE); }}>
              <option value="">ทั้งหมด</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="field" style={{ ...field, flexGrow: 2 }}>
            <label className="label" htmlFor="bank-search">ค้นหาในโจทย์</label>
            <input id="bank-search" className="input" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="พิมพ์คำที่อยู่ในโจทย์…" />
          </div>
        </div>
      </div>

      <div className="t-sm muted mb-3" aria-live="polite">แสดง <b className="fg tnum">{Math.min(shown.length, limit)}</b> จาก <b className="fg tnum">{shown.length}</b> ข้อ</div>

      {shown.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="clipboard" size={24} /></div>
          <div className="fw-6 fg">{data.rows.length === 0 ? "ยังไม่มีข้อสอบในคลัง" : "ไม่พบข้อสอบตามตัวกรอง"}</div>
          <div className="t-sm muted">{data.rows.length === 0 ? "เพิ่มข้อสอบได้ที่หน้าคลังข้อสอบของแต่ละบทในชุดติว" : "ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา"}</div>
        </div></div>
      ) : (
        <div className="tw-rail">
          {shown.slice(0, limit).map((r) => {
            const lesson = lessonById.get(r.lessonId);
            const setItem = setById.get(r.setId);
            return (
              <Link key={r.id} href={`/i/lesson/${r.lessonId}/bank#q-${r.id}`} className="tw-q" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-2 wrap">
                    <Badge tone="muted">{setItem?.code}</Badge>
                    <span className="t-xs muted">บทที่ {lesson?.index} {lesson?.title}</span>
                    {r.topic ? <Badge tone="primary">{r.topic}</Badge> : <Badge tone="muted">ไม่มีหัวข้อ</Badge>}
                  </div>
                  <div className="t-sm fw-6 pretty" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{r.text}</div>
                  {r.answerText && <div className="t-xs mt-2 truncate" style={{ color: "var(--success)" }}>เฉลย: {r.answerText}</div>}
                </div>
                <Icon name="arrR" size={16} className="muted" style={{ flex: "0 0 16px", alignSelf: "center" }} />
              </Link>
            );
          })}
        </div>
      )}

      {shown.length > limit && (
        <div className="flex justify-center mt-4"><button type="button" className="btn btn-outline" onClick={() => setLimit((n) => n + PAGE)}>แสดงเพิ่ม</button></div>
      )}
    </div>
  );
}
