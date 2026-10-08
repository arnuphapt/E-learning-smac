"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { STATUS_LABEL, PASS_PERCENT, STRONG_PERCENT } from "@/lib/tutor-analysis";
import AskAi from "@/components/tutor/AskAi";

// Result of a tutor lesson: score, per-topic bars + badges, topics to review with reasons, per-question review.
// Data from /api/tutor/lessons/<id>/result: the best attempt of the student by default, or ?attempt=<id> (also picked
// from the rounds list). Everything shown here was computed by the server when the round ended; this page only draws it.
// ?attempt= is read from window.location once on load (no useSearchParams, so the page needs no Suspense boundary).

const resultUrl = (id, attemptId) =>
  "/api/tutor/lessons/" + encodeURIComponent(id) + "/result" + (attemptId ? "?attempt=" + encodeURIComponent(attemptId) : "");
const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const TONE = { weak: "danger", fair: "warning", strong: "success" };
const COLOR = { weak: "var(--danger)", fair: "var(--warning)", strong: "var(--success)" };

function Empty({ title, text, nav, to, action }) {
  return (
    <div className="container p-5">
      <div className="clay-card" style={{ padding: "48px 24px" }}>
        <div className="empty">
          <div className="clay-well" style={{ width: 48, height: 48, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <Icon name="alert" size={22} style={{ color: "var(--warning)" }} />
          </div>
          <div className="fw-6 fg" style={{ fontSize: "16px" }}>{title}</div>
          <div className="t-sm muted mt-1">{text}</div>
          <button className="clay-btn clay-btn-soft clay-btn-sm mt-3" onClick={() => nav(to)}>{action}</button>
        </div>
      </div>
    </div>
  );
}

// AI summary (ticket 06). Stored on the attempt: shown straight from the result payload when it exists, otherwise the first
// open asks the server to generate it (POST .../summary, once; the server never calls Gemini again once it is stored).
// A failure leaves the rest of the page as it is; opening the page again retries.
function SummaryCard({ attemptId, initial }) {
  const [state, setState] = useState(initial ? { s: initial } : { loading: true });
  const started = useRef(false);
  useEffect(() => {
    if (initial || started.current) return;
    started.current = true;
    fetch("/api/tutor/attempts/" + encodeURIComponent(attemptId) + "/summary", { method: "POST" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setState(d.summary ? { s: d.summary } : { busy: true }))
      .catch(() => setState({ failed: true }));
  }, [attemptId, initial]);

  const s = state.s;
  return (
    <div className="clay-card mb-4" style={{ padding: "26px 28px" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="clay-badge clay-badge-primary">
          <Icon name="sparkle" size={14} style={{ color: "var(--primary)" }} />
          สรุปจาก AI
        </span>
      </div>
      {state.loading && <div className="t-sm muted" style={{ color: "#64748b" }}>AI กำลังสรุปผลของคุณ…</div>}
      {state.busy && <div className="t-sm muted" style={{ color: "#64748b" }}>AI กำลังสรุปผลอยู่ ลองเปิดหน้านี้ใหม่อีกครั้งในอีกสักครู่</div>}
      {state.failed && <div className="t-sm muted" style={{ color: "#64748b" }}>ยังสรุปด้วย AI ไม่ได้ในตอนนี้ ผลคะแนนและเฉลยด้านล่างใช้ได้ตามปกติ ลองเปิดหน้านี้ใหม่อีกครั้งเพื่อให้ AI สรุปใหม่</div>}
      {s && (
        <>
          <div className="t-sm pretty mb-3" style={{ whiteSpace: "pre-line", lineHeight: 1.65, color: "#334155" }}>{s.overview}</div>
          {s.topic_notes.length > 0 && (
            <div className="flex col gap-2 mb-3">
              {s.topic_notes.map((n, i) => (
                <div key={i} className="t-sm clay-well" style={{ padding: "10px 14px", borderRadius: 12 }}>
                  <b>{n.topic}</b><span className="muted" style={{ color: "#64748b" }}> · {n.comment}</span>
                </div>
              ))}
            </div>
          )}
          {s.next_steps.length > 0 && (
            <div className="clay-well" style={{ padding: "14px 18px", borderRadius: 14 }}>
              <div className="t-sm fw-6 mb-1" style={{ color: "var(--fg)" }}>ควรทำต่อ</div>
              <ul className="t-sm" style={{ paddingLeft: 20, margin: 0, color: "#475569", lineHeight: 1.6 }}>
                {s.next_steps.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReviewItem({ r, attemptId }) {
  const status = r.unanswered ? "unanswered" : r.correct ? "correct" : "wrong";
  const badgeClass = { correct: "clay-badge-success", wrong: "clay-badge-danger", unanswered: "clay-badge-warning" }[status];
  const badgeLabel = { correct: "ตอบถูก", wrong: "ตอบผิด", unanswered: "ไม่ได้ตอบ" }[status];
  const known = (id) => r.choices.some((c) => c.id === id);
  return (
    <div className="clay-card mb-4" style={{ padding: "24px 26px" }}>
      <div className="flex items-center gap-2 mb-3 wrap">
        <span className="fw-7 t-base">ข้อ {r.n}</span>
        <span className={"clay-badge " + badgeClass}>{badgeLabel}</span>
        {r.topic && <span className="clay-badge">{r.topic}</span>}
      </div>
      {r.deleted ? (
        <div className="t-sm muted">ข้อนี้ถูกลบแล้ว</div>
      ) : (
        <>
          <div className="t-base fw-6 pretty mb-3" style={{ lineHeight: 1.6, color: "var(--fg)" }}>{r.text}</div>
          <div className="flex col gap-2.5 mb-3">
            {r.choices.map((c) => {
              const isAnswer = c.id === r.answer;
              const isChosen = c.id === r.chosen;
              const border = isAnswer ? "var(--success)" : isChosen ? "var(--danger)" : "#e2e8f0";
              const bg = isAnswer ? "var(--success-soft)" : isChosen ? "var(--danger-soft)" : "#ffffff";
              return (
                <div key={c.id} className="flex items-center gap-3 wrap" style={{ padding: "12px 16px", borderRadius: 14, border: "1.5px solid " + border, background: bg, boxShadow: "0 2px 6px rgba(15,23,42,.03)" }}>
                  <span className="t-base flex-1" style={{ minWidth: 0, color: "var(--fg)", fontWeight: isChosen || isAnswer ? 600 : 400 }}>{c.text}</span>
                  {isChosen && <span className={"clay-badge " + (isAnswer ? "clay-badge-success" : "clay-badge-danger")}>คำตอบของคุณ</span>}
                  {isAnswer && <span className="clay-badge clay-badge-success">เฉลย</span>}
                </div>
              );
            })}
          </div>
          {r.chosen && !known(r.chosen) && <div className="t-xs muted mb-2" style={{ color: "#64748b" }}>คำตอบของคุณเป็นตัวเลือกที่ถูกแก้ไขหรือลบไปแล้ว</div>}
          {!known(r.answer) && <div className="t-xs muted mb-2" style={{ color: "#64748b" }}>ตัวเลือกที่เป็นเฉลยถูกแก้ไขหรือลบไปแล้ว</div>}
          <div className="clay-well mb-2" style={{ padding: 14, borderRadius: 12 }}>
            <div className="t-xs fw-6 muted mb-1" style={{ color: "#64748b" }}>คำอธิบายของอาจารย์</div>
            <div className="t-sm pretty" style={{ whiteSpace: "pre-line", color: "#334155", lineHeight: 1.6 }}>{r.explanation || "อาจารย์ยังไม่ได้เขียนคำอธิบายข้อนี้"}</div>
          </div>
          <AskAi attemptId={attemptId} questionId={r.questionId} />
        </>
      )}
    </div>
  );
}

export default function StudentTutorResult() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const id = useParams()?.id;
  const [info, setInfo] = useState(null); // { set, lesson } for the breadcrumb
  const [data, setData] = useState(null); // the result payload
  const [view, setView] = useState("loading"); // loading | ok | none | running | missing
  const [switching, setSwitching] = useState(false);

  const load = useCallback(
    async (attemptId) => {
      setSwitching(true);
      try {
        const r = await fetch(resultUrl(id, attemptId), { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { setData(d); setView("ok"); }
        else if (r.status === 409 && d.state === "none") setView("none");
        else if (r.status === 409 && d.state === "in_progress") setView("running");
        else setView("missing");
      } catch {
        setView("missing");
      } finally {
        setSwitching(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch("/api/tutor/lessons/" + encodeURIComponent(id), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setInfo(d); })
      .catch(() => { if (!cancelled) setView("missing"); });
    const t = setTimeout(() => load(new URLSearchParams(window.location.search).get("attempt")), 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [id, load]);

  if (view === "missing") {
    return <Empty nav={nav} to="/s/tutor" action="กลับไปรายการชุดติว" title="ไม่พบผลการทำข้อสอบ" text="ไม่พบผลนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ" />;
  }
  if (view === "running") {
    return <Empty nav={nav} to={"/s/tutor/lesson/" + id + "/exam"} action="กลับไปทำข้อสอบต่อ" title="รอบนี้ยังทำไม่เสร็จ" text="ผลและเฉลยจะแสดงหลังส่งคำตอบหรือหมดเวลาเท่านั้น" />;
  }
  if (!info || view === "loading") return <Loading className="container p-5 text-center muted" />;

  const { set, lesson } = info;
  const crumb = [
    { label: "ชุดติวของฉัน", to: "/s/tutor" },
    { label: set.code, to: "/s/tutor/" + set.id },
    { label: "บทที่ " + lesson.index, to: "/s/tutor/lesson/" + lesson.id },
    { label: "ผลการทำข้อสอบ" },
  ];
  const examPath = "/s/tutor/lesson/" + lesson.id + "/exam";

  if (view === "none") {
    return (
      <div className="container" style={{ paddingBottom: 40 }}>
        <Crumb nav={nav} items={crumb} />
        <div className="clay-card" style={{ padding: "48px 24px" }}>
          <div className="empty">
            <div className="clay-well" style={{ width: 48, height: 48, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Icon name="book" size={24} style={{ color: "var(--primary)" }} />
            </div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ยังไม่มีผลการทำข้อสอบ</div>
            <div className="t-sm muted mt-1">ทำข้อสอบบทนี้และส่งคำตอบ แล้วผลวิเคราะห์จะแสดงที่นี่</div>
            <button className="clay-btn clay-btn-primary clay-btn-sm mt-3" onClick={() => nav(examPath)}>
              <Icon name="play" size={14} />ทำข้อสอบ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { attempt, bestId, rounds, analysis, review } = data;
  const isBest = attempt.id === bestId;
  const { overall, groups } = analysis;
  const best = rounds.find((x) => x.id === bestId);
  return (
    <div className="container" style={{ opacity: switching ? 0.6 : 1, transition: ".15s", paddingBottom: 60 }}>
      <Crumb nav={nav} items={crumb} />

      <div className="clay-card mb-4" style={{ padding: "32px 30px" }}>
        <div className="flex items-center gap-2 mb-3 wrap">
          <span className="clay-badge clay-badge-primary" style={{ fontWeight: 700 }}>{set.code}</span>
          <span className={"clay-badge " + (overall.pass ? "clay-badge-success" : "clay-badge-danger")}>
            {overall.pass ? "ผ่าน" : "ไม่ผ่าน"}
          </span>
          {isBest ? (
            <span className="clay-badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>รอบที่ดีที่สุด</span>
          ) : (
            <span className="clay-badge">รอบที่ {attempt.number}</span>
          )}
        </div>
        <h1 className="t-xl fw-7 serif mb-1" style={{ margin: "0 0 6px" }}>บทที่ {lesson.index} · {lesson.title}</h1>
        
        <div className="clay-well my-4 text-center" style={{ padding: "20px 36px", display: "inline-flex", flexDirection: "column", borderRadius: 24, margin: "16px 0" }}>
          <div className="serif fw-7" style={{ fontSize: 56, lineHeight: 1.1, color: overall.pass ? "var(--success)" : "var(--primary)" }} aria-label="คะแนนรวม">
            {attempt.score}<span className="muted" style={{ fontSize: 28, color: "#64748b" }}> / {attempt.total}</span>
            <span className="muted" style={{ fontSize: 22, color: "#64748b" }}> ({overall.percent}%)</span>
          </div>
        </div>

        <div className="t-sm muted mb-2" style={{ color: "#475569" }}>คะแนนรวม (ข้อที่ไม่ได้ตอบนับเป็นผิด) · เกณฑ์ผ่าน {PASS_PERCENT}%</div>
        <div className="t-sm muted mb-4" style={{ color: "#64748b" }}>
          กำลังดูรอบที่ {attempt.number} จากที่ทำแล้ว {rounds.length} รอบ
          {attempt.status === "expired" ? " (หมดเวลา ระบบส่งให้)" : ""} · ส่งเมื่อ {fmt(attempt.submittedAt)}
          {!isBest && best && (
            <> · <a href="#best" onClick={(e) => { e.preventDefault(); load(best.id); }} className="c-primary" style={{ fontWeight: 600 }}>ดูรอบที่ดีที่สุด (รอบที่ {best.number}: {best.score}/{best.total})</a></>
          )}
        </div>
        <div className="flex gap-2.5 wrap">
          <button className="clay-btn clay-btn-primary" onClick={() => nav(examPath)}><Icon name="play" size={15} />ทำอีกครั้ง</button>
          <button className="clay-btn clay-btn-soft" onClick={() => nav("/s/tutor/lesson/" + lesson.id)}>กลับไปหน้าบทเรียน</button>
        </div>
      </div>

      {rounds.length > 1 && (
        <div className="clay-card mb-4" style={{ padding: "22px 26px" }}>
          <div className="t-base fw-7 mb-2" style={{ fontSize: 16 }}>รอบที่ทำแล้ว</div>
          <div className="flex gap-2 wrap">
            {rounds.map((x) => (
              <button
                key={x.id}
                className={"clay-btn clay-btn-sm " + (x.id === attempt.id ? "clay-btn-primary" : "clay-btn-soft")}
                disabled={switching || x.id === attempt.id}
                onClick={() => load(x.id)}
              >
                รอบที่ {x.number} · {x.score}/{x.total}{best && x.id === best.id ? " ★" : ""}
              </button>
            ))}
          </div>
          <div className="t-xs muted mt-2" style={{ color: "#64748b" }}>★ = รอบที่ดีที่สุด (สัดส่วนคะแนนสูงสุด ถ้าเท่ากันใช้รอบล่าสุด)</div>
        </div>
      )}

      <div className="clay-card mb-4" style={{ padding: "26px 28px" }}>
        <div className="t-base fw-7 mb-1" style={{ fontSize: 16 }}>ผลรายหัวข้อ</div>
        <div className="t-xs muted mb-4" style={{ color: "#64748b" }}>ต่ำกว่า {PASS_PERCENT}% = {STATUS_LABEL.weak} · {PASS_PERCENT}–{STRONG_PERCENT - 1}% = {STATUS_LABEL.fair} · {STRONG_PERCENT}% ขึ้นไป = {STATUS_LABEL.strong}</div>
        <div className="flex col gap-4">
          {groups.map((g) => (
            <div key={g.topic_id ?? "none"}>
              <div className="flex items-center gap-2 mb-1.5 wrap">
                <span className="t-sm fw-6 flex-1" style={{ minWidth: 0, color: "var(--fg)" }}>{g.name}</span>
                <span className="t-xs muted" style={{ color: "#64748b" }}>ถูก {g.correct}/{g.total} ข้อ · {g.percent}%</span>
                <span className={"clay-badge clay-badge-" + TONE[g.status]}>{STATUS_LABEL[g.status]}</span>
              </div>
              <div className="clay-progress" role="img" aria-label={g.name + " " + g.percent + "%"}>
                <div className="clay-progress-bar" style={{ width: g.percent + "%", background: COLOR[g.status] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <SummaryCard key={attempt.id} attemptId={attempt.id} initial={data.summary} />

      <div className="clay-card mb-4" style={{ padding: "26px 28px" }}>
        <div className="t-base fw-7 mb-3" style={{ fontSize: 16 }}>หัวข้อที่ควรทบทวน</div>
        {analysis.review.length === 0 ? (
          <div className="t-sm muted" style={{ color: "#64748b" }}>ไม่มีหัวข้อที่ต้องทบทวนเพิ่ม ทุกหัวข้อเป็นจุดแข็ง</div>
        ) : (
          <div className="flex col gap-3">
            {analysis.review.map((x) => (
              <div key={x.topic_id ?? "none"} className="clay-well flex items-start gap-3" style={{ padding: "12px 16px", borderRadius: 14 }}>
                <span className={"clay-badge clay-badge-" + TONE[x.status]}>{STATUS_LABEL[x.status]}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="t-sm fw-6" style={{ color: "var(--fg)" }}>{x.name}</div>
                  <div className="t-sm muted mt-0.5" style={{ color: "#64748b" }}>{x.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="t-base fw-7 mb-3 px-1" style={{ fontSize: 17 }}>ทบทวนรายข้อ</h2>
      {review.map((r) => <ReviewItem key={r.questionId} r={r} attemptId={attempt.id} />)}
    </div>
  );
}
