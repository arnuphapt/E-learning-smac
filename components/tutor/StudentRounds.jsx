"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { roundsOf } from "@/lib/tutor-results";
import { STATUS_LABEL } from "@/lib/tutor-analysis";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";

export const fmtDate = (iso, time) =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—";

export function TopicBars({ groups }) {
  return (
    <div className="tw-bars">
      {groups.map((g) => (
        <div key={g.topic_id ?? "none"} className="tw-bar-row">
          <span className="tw-bar-name truncate" title={g.name}>{g.name}</span>
          <span className="tw-bar" data-s={g.status} role="img" aria-label={`${g.name} ${g.percent}%`}><i style={{ width: g.percent + "%" }} /></span>
          <span className="tw-bar-pct" data-s={g.status}>{g.percent}%<span className="tw-bar-st">{STATUS_LABEL[g.status]}</span></span>
        </div>
      ))}
    </div>
  );
}

function Review({ n, row, q }) {
  const state = row.unanswered ? "unanswered" : row.correct ? "correct" : "wrong";
  const tone = { correct: "success", wrong: "danger", unanswered: "warning" }[state];
  const label = { correct: "ตอบถูก", wrong: "ตอบผิด", unanswered: "ไม่ได้ตอบ" }[state];
  return (
    <div className="tw-q">
      <span className="tw-q-no">{n}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center gap-2 wrap mb-1">
          <span className={"badge badge-" + tone}>{label}</span>
          {row.topic && <span className="badge badge-muted">{row.topic}</span>}
        </div>
        {!q ? (
          <div className="t-sm muted">ข้อนี้ถูกลบแล้ว</div>
        ) : (
          <>
            <div className="t-base fw-6 pretty mb-2">{q.text}</div>
            <div className="tw-choices">
              {(q.choices || []).map((c) => {
                const isAnswer = c.id === row.answer;
                const isChosen = c.id === row.chosen;
                return (
                  <div key={c.id} className="tw-choice" data-answer={isAnswer || undefined} data-wrong={(isChosen && !isAnswer) || undefined}>
                    <span style={{ minWidth: 0, flex: 1 }}>{c.text}</span>
                    {isChosen && <span className="tw-choice-tag">นักศึกษาตอบ</span>}
                    {isAnswer && <span className="tw-choice-tag">เฉลย</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Side panel of one student: their ended rounds, and the stored result of the chosen round (topic bars + per-question review).
// The result is read from tutor_attempts.result (what the student saw); question text / choices are read live from `questions`.
// attempts: every attempt row of the lesson (already loaded by the tab); only this student's are used.
export default function StudentRounds({ student, user, lesson, attempts, onClose }) {
  const rounds = roundsOf(attempts, student.student_id);
  const [picked, setPicked] = useState(student.best.id);
  const [detail, setDetail] = useState({}); // attemptId -> { result, qs } | { error }
  const closeRef = useRef(null);
  const cur = detail[picked];

  useEffect(() => {
    const back = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); back?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (detail[picked]) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("tutor_attempts").select("result").eq("id", picked).maybeSingle();
      if (error || !data?.result) return { error: true };
      const ids = data.result.rows.map((r) => r.question_id);
      const { data: qs, error: qErr } = ids.length
        ? await supabase.from("questions").select("id, text, choices").in("id", ids).eq("lesson_id", lesson.id).eq("kind", "tutor")
        : { data: [] };
      if (qErr) return { error: true };
      return { result: data.result, qs: new Map((qs || []).map((q) => [q.id, q])) };
    })()
      .catch(() => ({ error: true }))
      .then((r) => { if (!cancelled) setDetail((d) => ({ ...d, [picked]: r })); });
    return () => { cancelled = true; };
  }, [picked, lesson.id, detail]);

  const round = rounds.find((r) => r.id === picked);
  return (
    <div className="tw-drawer-bg" onClick={onClose}>
      <aside className="tw-drawer" role="dialog" aria-modal="true" aria-label={"ผลของ " + (user?.name || "นักศึกษา")} onClick={(e) => e.stopPropagation()}>
        <header className="tw-drawer-h">
          <div style={{ minWidth: 0 }}>
            <h2 className="truncate">{user?.name || "(ไม่พบผู้ใช้)"}</h2>
            <div className="t-sm muted">{user?.student_no ? <span className="mono">{user.student_no}</span> : "ไม่มีรหัสนักศึกษา"} · บทที่ {lesson.index} {lesson.title}</div>
          </div>
          <button ref={closeRef} className="iconbtn ghost" onClick={onClose} aria-label="ปิด"><Icon name="x" size={18} /></button>
        </header>

        <div className="tw-drawer-b">
          <div className="t-sm fw-6 mb-2">รอบที่ทำแล้ว ({rounds.length})</div>
          <div className="tw-rounds">
            {rounds.map((r) => (
              <button key={r.id} className={r.id === picked ? "on" : ""} onClick={() => setPicked(r.id)} aria-pressed={r.id === picked}>
                <b>รอบที่ {r.number}</b>
                <span>{r.score}/{r.total} · {r.percent}%</span>
                {r.id === student.best.id && <em>ดีที่สุด</em>}
              </button>
            ))}
          </div>
          {round && (
            <div className="t-sm muted mt-2">
              {fmtDate(round.submittedAt || round.startedAt, true)}{round.status === "expired" ? " · หมดเวลา ระบบส่งให้" : ""}
            </div>
          )}

          {!cur && <Loading className="p-5 text-center muted" />}
          {cur?.error && <div className="tw-warn mt-4">โหลดผลของรอบนี้ไม่สำเร็จ ลองเลือกรอบอีกครั้ง</div>}
          {cur?.result && (
            <>
              <div className="t-sm fw-6 mt-5 mb-2">ผลรายหัวข้อ</div>
              <TopicBars groups={cur.result.analysis.groups} />
              <div className="t-sm fw-6 mt-5 mb-1">ทบทวนรายข้อ ({cur.result.rows.length} ข้อ)</div>
              <div className="tw-review">
                {cur.result.rows.map((row, i) => <Review key={row.question_id + i} n={i + 1} row={row} q={cur.qs.get(row.question_id)} />)}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
