"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { visibleTutorSets, filterBank, topicNames } from "@/lib/tutor-bank";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";
import { Badge, Select } from "@/components/ui/Primitives";

const PAGE = 200; // rows rendered at once; "แสดงเพิ่ม" adds another page

// PostgREST returns at most 1000 rows per request: read the tutor bank in pages so a big bank is not cut silently.
async function allTutorQuestions() {
  const out = [];
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
  const [data, setData] = useState(null); // { sets, lessons, rows, setById, lessonById } or { error }
  const [setId, setSetId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [cRes, lRes, ciRes, topicRes, questions] = await Promise.all([
          supabase.from("courses_all").select("id, code, title, group_id").eq("kind", "tutor").order("code"),
          supabase.from("lessons").select("id, course_id, index, title"),
          supabase.from("course_instructors").select("course_id").eq("user_id", user.id),
          supabase.from("tutor_topics").select("id, name"),
          allTutorQuestions(),
        ]);
        const err = cRes.error || lRes.error || ciRes.error || topicRes.error;
        if (err) throw err;
        if (cancelled) return;
        const sets = visibleTutorSets(cRes.data, user, (ciRes.data || []).map((ci) => ci.course_id));
        const setById = new Map(sets.map((c) => [c.id, c]));
        const setOrder = new Map(sets.map((c, i) => [c.id, i]));
        const lessons = (lRes.data || []).filter((l) => setById.has(l.course_id))
          .sort((a, b) => setOrder.get(a.course_id) - setOrder.get(b.course_id) || a.index - b.index);
        const lessonById = new Map(lessons.map((l) => [l.id, l]));
        const topicById = new Map((topicRes.data || []).map((t) => [t.id, t.name]));
        const lessonOrder = new Map(lessons.map((l, i) => [l.id, i]));
        const rows = questions
          .filter((r) => lessonById.has(r.lesson_id))
          .map((r) => ({
            id: r.id, no: r.no || 0, text: r.text || "", lessonId: r.lesson_id, setId: lessonById.get(r.lesson_id).course_id,
            topic: topicById.get(r.topic_id) || "",
            answerText: (r.choices || []).find((c) => c.id === r.answer)?.text || "",
          }))
          .sort((a, b) => lessonOrder.get(a.lessonId) - lessonOrder.get(b.lessonId) || a.no - b.no);
        setData({ sets, lessons, rows, setById, lessonById });
      } catch (e) {
        if (!cancelled) setData({ error: e.message });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const rows = data?.rows;
  const scoped = useMemo(() => (rows ? filterBank(rows, { setId, lessonId }) : []), [rows, setId, lessonId]);
  const topics = useMemo(() => topicNames(scoped), [scoped]);
  const shown = useMemo(() => (rows ? filterBank(rows, { setId, lessonId, topic, q }) : []), [rows, setId, lessonId, topic, q]);

  if (!data) return <Loading className="container p-5 text-center muted" />;
  if (data.error) {
    return <div className="container p-5"><div className="card"><div className="empty">
      <div className="fw-6 fg">โหลดคลังข้อสอบไม่สำเร็จ</div><div className="t-sm muted">{data.error}</div>
    </div></div></div>;
  }

  const { sets, lessons, setById, lessonById } = data;
  const lessonOptions = lessons.filter((l) => !setId || l.course_id === setId);
  const field = { flex: "1 1 200px", minWidth: 0 };

  return (
    <div className="container">
      <div className="tw-head">
        <div>
          <span className="tw-tag">โหมดติว</span>
          <h1>คลังข้อสอบ</h1>
          <div className="tw-stats">
            <span><b>{rows.length}</b>ข้อทั้งหมด</span>
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
          <div className="fw-6 fg">{rows.length === 0 ? "ยังไม่มีข้อสอบในคลัง" : "ไม่พบข้อสอบตามตัวกรอง"}</div>
          <div className="t-sm muted">{rows.length === 0 ? "เพิ่มข้อสอบได้ที่หน้าคลังข้อสอบของแต่ละบทในชุดติว" : "ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา"}</div>
        </div></div>
      ) : (
        <div className="tw-rail">
          {shown.slice(0, limit).map((r) => {
            const lesson = lessonById.get(r.lessonId);
            return (
              <Link key={r.id} href={`/i/lesson/${r.lessonId}/bank#q-${r.id}`} className="tw-q" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-2 wrap">
                    <Badge tone="muted">{setById.get(r.setId).code}</Badge>
                    <span className="t-xs muted">บทที่ {lesson.index} {lesson.title}</span>
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
        <div className="flex justify-center mt-4"><button className="btn btn-outline" onClick={() => setLimit((n) => n + PAGE)}>แสดงเพิ่ม</button></div>
      )}
    </div>
  );
}
