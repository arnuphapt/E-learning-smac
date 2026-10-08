"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { summarizeLesson, exportRows } from "@/lib/tutor-results";
import { PASS_PERCENT, STRONG_PERCENT, STATUS_LABEL } from "@/lib/tutor-analysis";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import StudentRounds, { fmtDate } from "@/components/tutor/StudentRounds";

const PAGE = 1000; // PostgREST returns at most 1000 rows per request
const CHUNK = 100; // ids per .in() so the URL stays short
const TONE = { weak: "danger", fair: "warning", strong: "success" };

// Every attempt of the set's lessons, light columns only: the per-topic groups come out of the stored result with a JSON path,
// the per-question rows are fetched later, for one round, when a student is opened.
async function loadAttempts(lessonIds) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("tutor_attempts")
      .select("id, student_id, lesson_id, score, total, status, started_at, submitted_at, groups:result->analysis->groups")
      .in("lesson_id", lessonIds)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

async function loadUsers(ids) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
  const res = await Promise.all(chunks.map((c) => supabase.from("users").select("id, name, email, student_no").in("id", c)));
  const map = new Map();
  for (const r of res) {
    if (r.error) throw r.error;
    for (const u of r.data) map.set(u.id, u);
  }
  return map;
}

// xlsx is loaded on demand, like the bank import.
const loadXlsx = async () => {
  const m = await import("xlsx");
  return m.utils ? m : m.default;
};

// Third tab of the instructor workspace: how the set's students did. Only ENDED rounds are scored (submitted / expired with a
// stored result); a running round is only counted. Students who never attempted are not listed (see the note in the overview).
export default function TutorResults({ course, lessons }) {
  const [data, setData] = useState(null); // { attempts, users }
  const [failed, setFailed] = useState(false);
  const [lessonId, setLessonId] = useState(lessons[0]?.id || "");
  const [open, setOpen] = useState(null); // student summary entry shown in the side panel
  const [exporting, setExporting] = useState(false);

  const ids = lessons.map((l) => l.id).join("|");
  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    (async () => {
      const attempts = await loadAttempts(ids.split("|"));
      const users = await loadUsers([...new Set(attempts.map((a) => a.student_id))]);
      if (!cancelled) setData({ attempts, users });
    })().catch((e) => { if (!cancelled) { setFailed(true); toast("โหลดผลการทำข้อสอบไม่สำเร็จ: " + e.message, "error"); } });
    return () => { cancelled = true; };
  }, [ids]);

  const summaries = useMemo(() => {
    const m = new Map();
    for (const l of lessons) m.set(l.id, summarizeLesson((data?.attempts || []).filter((a) => a.lesson_id === l.id)));
    return m;
  }, [data, lessons]);

  if (failed) return <div className="tw-panel"><div className="empty"><div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div><div className="fw-6 fg">โหลดผลการทำข้อสอบไม่สำเร็จ</div><div className="t-sm muted">ลองเปิดแท็บนี้อีกครั้ง</div></div></div>;
  if (lessons.length === 0) {
    return <div className="tw-panel"><div className="empty"><div className="ec"><Icon name="chart" size={22} /></div><div className="fw-6 fg">ยังไม่มีบทเรียน</div><div className="t-sm muted">เพิ่มบทเรียนและคลังข้อสอบก่อน แล้วผลของนักศึกษาจะแสดงที่นี่</div></div></div>;
  }
  if (!data) return <Loading className="p-5 text-center muted" />;

  const lesson = lessons.find((l) => l.id === lessonId) || lessons[0];
  const s = summaries.get(lesson.id);
  const total = s.spread.weak + s.spread.fair + s.spread.strong;
  const lessonAttempts = data.attempts.filter((a) => a.lesson_id === lesson.id);
  const anyResult = [...summaries.values()].some((x) => x.students.length > 0);

  const exportXlsx = async (only) => {
    setExporting(true);
    try {
      const XLSX = await loadXlsx();
      const wb = XLSX.utils.book_new();
      for (const l of only ? [only] : lessons) {
        const sum = summaries.get(l.id);
        if (!sum.students.length) continue;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(sum, data.users)), "บทที่ " + l.index);
      }
      if (!wb.SheetNames.length) return toast("ยังไม่มีผลที่ส่งออกได้", "error");
      XLSX.writeFile(wb, `ผลติว_${course.code}${only ? "_บทที่_" + only.index : ""}.xlsx`);
      toast("ส่งออกไฟล์ผลการทำข้อสอบสำเร็จ");
    } catch (e) {
      toast("ส่งออกไม่สำเร็จ: " + e.message, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="tw-res">
      <div className="tw-res-bar">
        <label className="tw-res-pick">
          <span className="t-sm fw-6">บทเรียน</span>
          <select className="input" value={lesson.id} onChange={(e) => { setLessonId(e.target.value); setOpen(null); }} aria-label="เลือกบทเรียน">
            {lessons.map((l) => {
              const n = summaries.get(l.id).students.length;
              return <option key={l.id} value={l.id}>{String(l.index ?? "").padStart(2, "0")} · {l.title || "(ไม่มีชื่อบทเรียน)"} ({n} คน)</option>;
            })}
          </select>
        </label>
        <div className="flex gap-2 wrap">
          <button className="btn btn-outline btn-sm" disabled={exporting || !s.students.length} onClick={() => exportXlsx(lesson)}><Icon name="download" size={14} />ส่งออกบทนี้</button>
          <button className="btn btn-outline btn-sm" disabled={exporting || !anyResult} onClick={() => exportXlsx(null)}><Icon name="excel" size={14} />ส่งออกทั้งชุด</button>
        </div>
      </div>

      <div className="tw-panel">
        <section className="tw-sec">
          <h3 className="tw-sec-t">ภาพรวมบทนี้</h3>
          <p className="tw-sec-d">นับเฉพาะรอบที่ส่งแล้วหรือหมดเวลา ใช้รอบที่ได้คะแนนดีที่สุดของนักศึกษาแต่ละคน และแสดงเฉพาะนักศึกษาที่เคยทำบทนี้</p>
          <dl className="tw-figs">
            <div><dt>นักศึกษาที่ทำแล้ว</dt><dd>{s.students.length}<small> คน</small></dd></div>
            <div><dt>จำนวนรอบทั้งหมด</dt><dd>{s.rounds}<small> รอบ</small></dd></div>
            <div><dt>เฉลี่ยคะแนนดีที่สุด</dt><dd>{s.avgBest ?? "—"}{s.avgBest != null && <small>%</small>}</dd></div>
            <div><dt>กำลังทำอยู่</dt><dd>{s.inProgress}<small> รอบ</small></dd></div>
          </dl>
          {total > 0 && (
            <div className="tw-spread">
              <div className="tw-spread-bar" role="img" aria-label={`ต่ำกว่า ${PASS_PERCENT}% ${s.spread.weak} คน, ${PASS_PERCENT} ถึง ${STRONG_PERCENT - 1}% ${s.spread.fair} คน, ${STRONG_PERCENT}% ขึ้นไป ${s.spread.strong} คน`}>
                {["weak", "fair", "strong"].map((k) => s.spread[k] > 0 && <i key={k} data-s={k} style={{ flex: s.spread[k] }} />)}
              </div>
              <ul className="tw-spread-key">
                <li data-s="weak"><b>{s.spread.weak}</b> ต่ำกว่า {PASS_PERCENT}%</li>
                <li data-s="fair"><b>{s.spread.fair}</b> {PASS_PERCENT}–{STRONG_PERCENT - 1}%</li>
                <li data-s="strong"><b>{s.spread.strong}</b> {STRONG_PERCENT}% ขึ้นไป</li>
              </ul>
            </div>
          )}
        </section>

        {s.students.length === 0 ? (
          <section className="tw-sec">
            <div className="empty">
              <div className="ec"><Icon name="users" size={22} /></div>
              <div className="fw-6 fg">ยังไม่มีนักศึกษาที่ทำข้อสอบบทนี้เสร็จ</div>
              <div className="t-sm muted pretty">{s.inProgress > 0 ? `มี ${s.inProgress} รอบที่กำลังทำอยู่ ผลจะแสดงเมื่อส่งหรือหมดเวลา` : "เมื่อนักศึกษาส่งรอบแรก ผลจะแสดงที่นี่"}</div>
            </div>
          </section>
        ) : (
          <>
            <section className="tw-sec">
              <h3 className="tw-sec-t">หัวข้อของทั้งชั้น</h3>
              <p className="tw-sec-d">รวมคำตอบถูกต่อทั้งหมดของทุกคนในรอบที่ดีที่สุด เรียงจากหัวข้อที่ทำได้น้อยที่สุด</p>
              <div className="tw-bars">
                {s.topics.map((t) => (
                  <div key={t.key} className="tw-bar-row">
                    <span className="tw-bar-name truncate" title={t.name}>{t.name}</span>
                    <span className="tw-bar" data-s={t.status} role="img" aria-label={`${t.name} ${t.percent}%`}><i style={{ width: t.percent + "%" }} /></span>
                    <span className="tw-bar-pct" data-s={t.status}>{t.percent}%<span className="tw-bar-st">{STATUS_LABEL[t.status]} · {t.students} คน</span></span>
                  </div>
                ))}
              </div>
            </section>

            <section className="tw-sec tw-sec-flush">
              <div className="tw-sec-pad">
                <h3 className="tw-sec-t">นักศึกษา ({s.students.length})</h3>
                <p className="tw-sec-d">เรียงจากคะแนนต่ำสุดขึ้นก่อน กดที่แถวเพื่อดูรอบที่ทำและเฉลยรายข้อ</p>
              </div>
              <div className="tw-res-row head" aria-hidden="true">
                <span>ชื่อ</span><span>รหัสนักศึกษา</span><span>รอบ</span><span>คะแนนดีที่สุด</span><span>ทำล่าสุด</span><span>หัวข้อที่อ่อนที่สุด</span>
              </div>
              {s.students.map((st) => {
                const u = data.users.get(st.student_id);
                return (
                  <button key={st.student_id} className="tw-res-row" onClick={() => setOpen(st)} aria-label={"ดูผลของ " + (u?.name || "นักศึกษา")}>
                    <span className="tw-res-name truncate">{u?.name || "(ไม่พบผู้ใช้)"}</span>
                    <span className="mono" data-l="รหัสนักศึกษา">{u?.student_no || "—"}</span>
                    <span data-l="รอบ">{st.rounds}</span>
                    <span data-l="คะแนนดีที่สุด"><span className={"badge badge-" + TONE[st.best.status]}>{st.best.score}/{st.best.total} · {st.best.percent}%</span></span>
                    <span data-l="ทำล่าสุด">{fmtDate(st.latestAt, true)}</span>
                    <span className="truncate" data-l="หัวข้อที่อ่อนที่สุด" title={st.weakest?.name}>
                      {st.weakest ? <><span className="tw-weak" data-s={st.weakest.status}>{st.weakest.percent}%</span> {st.weakest.name}</> : "—"}
                    </span>
                  </button>
                );
              })}
            </section>
          </>
        )}
      </div>

      {open && (
        <StudentRounds key={open.student_id + lesson.id} student={open} user={data.users.get(open.student_id)} lesson={lesson} attempts={lessonAttempts} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
