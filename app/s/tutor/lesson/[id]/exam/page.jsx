"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useIsMobile } from "@/lib/hooks";
import { firstUnansweredIndex } from "@/lib/tutor-attempt";

// Tutor exam of one lesson. Data from /api/tutor/lessons/<id>/attempt:
//   GET  -> question count + minutes (pre-start screen) and whether a round is already open
//   POST -> start or resume; the payload holds ONLY this student's locked questions (no answers / explanations)
// One clock for the whole round, counted down from the server's deadline_at (server time offset, no sessionStorage).
// Closing the page and coming back resumes the same round: the questions, their order and the deadline are all server-side.
// Answers: every click is saved on the server at once (/api/tutor/attempts/<attemptId>/answer; optimistic, a failed save rolls
// back to the last value the SERVER confirmed, with an error). A save gives up after SAVE_TIMEOUT_MS so submit (which waits for
// the save chain) can never hang on a stuck request. Every save carries a per-question seq (server-clock based, strictly
// increasing); the server ignores a write whose seq is not newer, so an aborted request that lands late cannot overwrite a
// newer answer. After an abort the page re-reads the answers from the server (RESYNC_DELAY_MS later) so the UI shows what the
// server really holds. Submit and time-up both call /submit; the server scores and returns only
// score + total; the full result (analysis + review) is on ./result.

const attemptUrl = (id) => "/api/tutor/lessons/" + encodeURIComponent(id) + "/attempt";
const attemptActionUrl = (attemptId, action) => "/api/tutor/attempts/" + encodeURIComponent(attemptId) + "/" + action;
const SAVE_TIMEOUT_MS = 10000;
const RESYNC_DELAY_MS = 3000;
const post = (id, body) =>
  fetch(attemptUrl(id), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// POST payload -> exam state. offset = server clock minus this device's clock, so the countdown follows the server.
// ponytail: offset ignores network latency (error = one request trip, typically well under a second).
const toExam = (d) => ({
  attempt: d.attempt,
  questions: d.questions,
  deadlineMs: Date.parse(d.attempt.deadlineAt),
  offset: Date.parse(d.serverNow) - Date.now(),
  answers: d.answers,
  cur: firstUnansweredIndex(d.questions.map((q) => q.id), d.answers), // resume lands on the first unanswered question
});

// strictly increasing per page: the server clock in ms, or last + 1 when two clicks land in the same millisecond
const nextSeq = (last, offset) => Math.max(Date.now() + offset, last + 1);

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function StudentTutorExam() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const id = useParams()?.id;
  const mobile = useIsMobile();
  const [info, setInfo] = useState(null); // { set, lesson } for the title / breadcrumb
  const [pre, setPre] = useState(null); // GET preview
  const [exam, setExam] = useState(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [nowMs, setNowMs] = useState(0);
  const [empty, setEmpty] = useState(false); // the locked questions no longer exist (deleted / retyped mid-round)
  const [result, setResult] = useState(null); // { status, score, total } once the attempt has ended
  const [saveError, setSaveError] = useState("");
  const [submitError, setSubmitError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveChain = useRef(Promise.resolve()); // answer saves run one after another so the last click is the one stored
  const submitLock = useRef(false);
  const confirmed = useRef({}); // question id -> the choice the server has confirmed saving (the rollback target)
  const seqRef = useRef(0); // last seq handed out: server-clock ms, bumped by 1 when two clicks share a millisecond
  const pending = useRef(0); // clicks whose save has not finished (a resync must not overwrite them)
  const confirm = useConfirm();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [lr, pr] = await Promise.all([
          fetch("/api/tutor/lessons/" + encodeURIComponent(id), { cache: "no-store" }),
          fetch(attemptUrl(id), { cache: "no-store" }),
        ]);
        if (!lr.ok || !pr.ok) throw new Error("not available");
        const [lessonData, preview] = await Promise.all([lr.json(), pr.json()]);
        if (cancelled) return;
        setInfo(lessonData);
        if (preview.attempt && !preview.attempt.expired) {
          // a round is open: go straight back into it
          const rr = await post(id, { resume: true });
          if (cancelled) return;
          if (rr.ok) {
            const d = await rr.json();
            confirmed.current = { ...d.answers };
            setExam(toExam(d));
            setNowMs(Date.now());
            return;
          }
          if ((await rr.json().catch(() => ({}))).state === "empty") {
            if (!cancelled) setEmpty(true);
            return;
          }
        }
        if (preview.attempt?.expired) setNotice("รอบก่อนหน้าหมดเวลาแล้ว ระบบนับเป็นการส่งคำตอบ คุณเริ่มรอบใหม่ได้");
        setPre(preview);
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const running = !!exam;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  // time-up is derived from the same server-offset clock as the countdown
  const timeUp = !!exam && exam.deadlineMs - (nowMs + exam.offset) <= 0;

  async function submit(manual) {
    if (submitLock.current || result) return;
    if (manual) {
      const left = exam.questions.length - exam.questions.filter((x) => exam.answers[x.id] != null).length;
      const ok = await confirm({
        title: "ส่งคำตอบ",
        message: (left > 0 ? "ยังมี " + left + " ข้อที่ไม่ได้ตอบ (นับเป็นผิด)\n" : "") + "เมื่อส่งแล้วจะแก้คำตอบไม่ได้อีก ต้องการส่งใช่หรือไม่",
        confirmText: "ส่งคำตอบ",
      });
      if (!ok) return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(false);
    try {
      await saveChain.current; // let the last click reach the server before it is scored
      const r = await fetch(attemptActionUrl(exam.attempt.id, "submit"), { method: "POST" });
      if (!r.ok) throw new Error("submit failed");
      setResult(await r.json());
    } catch {
      setSubmitError(true);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  // auto-submit once when the clock runs out (a failed try shows a retry button, no loop)
  useEffect(() => {
    if (!timeUp) return;
    const t = setTimeout(() => submit(false), 0); // from a callback, not the effect body
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  // Re-read the answers the server holds (resume payload) and show them, unless a newer click is still being saved.
  async function resync() {
    try {
      const rr = await post(id, { resume: true });
      if (!rr.ok) return; // ended / expired: the submit path or the next save shows it
      const d = await rr.json();
      if (pending.current > 0) return;
      confirmed.current = { ...d.answers };
      setExam((e) => (e ? { ...e, answers: { ...d.answers } } : e));
    } catch { /* offline: the next save or reload re-syncs */ }
  }

  async function saveAnswer(qid, cid, seq) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), SAVE_TIMEOUT_MS);
    try {
      const r = await fetch(attemptActionUrl(exam.attempt.id, "answer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qid, chosen: cid, seq }),
        signal: ctl.signal,
      });
      if (r.status === 409) {
        const d = await r.json().catch(() => ({}));
        if (d.state === "ended") { setResult(d); return; } // the deadline passed under us: the server already ended + scored it
      }
      if (!r.ok) throw new Error("save failed");
      const d = await r.json().catch(() => ({}));
      if (d.applied === false) setTimeout(resync, 0); // the server already holds a newer answer for this question
      else confirmed.current[qid] = cid;
    } catch (err) {
      // roll back to what the server last confirmed (not the previous click, which may itself have failed), unless a
      // newer click on the same question has already replaced this one
      setExam((e) => {
        if (e.answers[qid] !== cid) return e;
        const answers = { ...e.answers };
        const ok = confirmed.current[qid];
        if (ok == null) delete answers[qid]; else answers[qid] = ok;
        return { ...e, answers };
      });
      setSaveError("บันทึกคำตอบไม่สำเร็จ กรุณาเลือกใหม่อีกครั้ง");
      // ponytail: an aborted request can still commit AFTER the resync read (server slower than RESYNC_DELAY_MS + the abort);
      // the seq stops it overwriting a newer click but not from being the newest one. Upgrade: poll the resume payload until
      // it is stable, or make the server reject writes older than the request's own timeout.
      if (err?.name === "AbortError") setTimeout(resync, RESYNC_DELAY_MS);
    } finally {
      clearTimeout(timer);
      pending.current -= 1;
    }
  }

  function choose(qid, cid) {
    if (timeUp || result || exam.answers[qid] === cid) return;
    setSaveError("");
    setExam((e) => ({ ...e, answers: { ...e.answers, [qid]: cid } }));
    const seq = (seqRef.current = nextSeq(seqRef.current, exam.offset));
    pending.current += 1;
    saveChain.current = saveChain.current.then(() => saveAnswer(qid, cid, seq));
  }

  async function start() {
    setBusy(true);
    try {
      const r = await post(id, {});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.state === "empty") setEmpty(true);
        else toast("เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่", "error");
        return;
      }
      confirmed.current = { ...d.answers };
      setExam(toExam(d));
      setNowMs(Date.now());
    } catch {
      toast("เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่", "error");
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <div className="container p-5">
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
          <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบข้อสอบ</div>
          <div className="t-sm muted">ไม่พบบทเรียนนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ</div>
          <button className="btn btn-outline btn-sm" onClick={() => nav("/s/tutor")}>กลับไปรายการชุดติว</button>
        </div></div>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="container p-5">
        <div className="clay-card" style={{ padding: "48px 24px" }}>
          <div className="empty">
            <div className="clay-well" style={{ width: 48, height: 48, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Icon name="alert" size={22} style={{ color: "var(--warning)" }} />
            </div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ข้อสอบรอบนี้ใช้งานไม่ได้</div>
            <div className="t-sm muted mt-1">ข้อสอบของบทนี้ถูกอาจารย์แก้ไขหรือลบ กรุณากลับมาทำใหม่ภายหลัง</div>
            <button className="clay-btn clay-btn-soft clay-btn-sm mt-3" onClick={() => nav("/s/tutor")}>
              <Icon name="arrL" size={14} />กลับไปรายการชุดติว
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!info || (!pre && !exam)) return <Loading className="container p-5 text-center muted" />;

  const { set, lesson } = info;
  const crumb = [
    { label: "ชุดติวของฉัน", to: "/s/tutor" },
    { label: set.code, to: "/s/tutor/" + set.id },
    { label: "บทที่ " + lesson.index, to: "/s/tutor/lesson/" + lesson.id },
    { label: "ทำข้อสอบ" },
  ];

  // ---- pre-start: question count and time before the clock starts ----
  if (!exam) {
    return (
      <div className="container" style={{ paddingBottom: 40 }}>
        <Crumb nav={nav} items={crumb} />
        <div className="clay-card" style={{ maxWidth: 560, margin: "0 auto", padding: 32 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="clay-badge clay-badge-primary" style={{ fontWeight: 700 }}>{set.code}</span>
            <span className="clay-badge">ชุดติว</span>
          </div>
          <h1 className="t-xl fw-7 serif mb-1" style={{ margin: "0 0 4px" }}>{lesson.title}</h1>
          <div className="muted t-sm mb-4" style={{ color: "#64748b" }}>บทที่ {lesson.index}</div>
          {notice && (
            <div className="clay-well flex items-start gap-3 mb-4" style={{ padding: 14, background: "var(--warning-soft)", color: "var(--warning)" }}>
              <Icon name="alert" size={18} /><div className="t-sm">{notice}</div>
            </div>
          )}
          {pre.count === 0 ? (
            <div className="t-sm muted mb-2">บทนี้ยังไม่มีข้อสอบ</div>
          ) : (
            <>
              <div className="flex gap-3 mb-4 wrap">
                <div className="clay-well flex-1" style={{ padding: "14px 18px", textAlign: "center" }}>
                  <div className="t-xs muted" style={{ color: "#64748b" }}>จำนวนข้อ</div>
                  <div className="t-xl fw-7 mt-1" style={{ color: "var(--fg)" }}>{pre.count} ข้อ</div>
                </div>
                <div className="clay-well flex-1" style={{ padding: "14px 18px", textAlign: "center" }}>
                  <div className="t-xs muted" style={{ color: "#64748b" }}>เวลาทั้งหมด</div>
                  <div className="t-xl fw-7 mt-1" style={{ color: "var(--fg)" }}>{pre.minutes} นาที</div>
                </div>
              </div>
              <ul className="t-sm muted pretty" style={{ margin: "0 0 24px", paddingLeft: 18, lineHeight: 1.7, color: "#475569" }}>
                <li>เวลา 1 นาทีต่อข้อ นับรวมทั้งชุดเป็นนาฬิกาเดียว</li>
                <li>นาฬิกาเริ่มเมื่อคุณกดเริ่ม และเดินต่อแม้ปิดหน้าจอหรือเน็ตหลุด</li>
                <li>ชุดข้อสุ่มใหม่ทุกรอบ ถ้ากลับเข้ามาระหว่างทำจะได้รอบเดิมต่อ</li>
              </ul>
              <button className="clay-btn clay-btn-primary w-full" disabled={busy} onClick={start} style={{ width: "100%", padding: "12px 20px" }}>
                <Icon name="play" size={16} />{busy ? "กำลังเริ่ม..." : "เริ่มทำข้อสอบ"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- submitted: score + total here, the full result (analysis, review) is on the result page ----
  if (result) {
    const attempt = exam.attempt;
    return (
      <div className="container" style={{ paddingBottom: 40 }}>
        <Crumb nav={nav} items={crumb} />
        <div className="clay-card text-center" style={{ maxWidth: 560, margin: "0 auto", padding: "40px 28px" }}>
          <div className="t-sm muted mb-1" style={{ color: "#64748b" }}>{result.status === "expired" ? "หมดเวลา ระบบส่งคำตอบให้แล้ว" : "ส่งคำตอบแล้ว"}</div>
          <div className="t-xs muted mb-4" style={{ color: "#94a3b8" }}>{set.code} · บทที่ {lesson.index} · {lesson.title}</div>
          <div className="clay-well" style={{ display: "inline-flex", flexDirection: "column", padding: "20px 40px", borderRadius: 24, margin: "0 auto 16px" }}>
            <div className="serif fw-7" style={{ fontSize: 56, lineHeight: 1.1, color: "var(--primary)" }} aria-label="คะแนนรวม">
              {result.score}<span className="muted" style={{ fontSize: 28, color: "#64748b" }}> / {result.total}</span>
            </div>
          </div>
          <div className="t-sm muted mb-5" style={{ color: "#64748b" }}>คะแนนรวม (ข้อที่ไม่ได้ตอบนับเป็นผิด)</div>
          <div className="flex gap-3 justify-center wrap">
            <button className="clay-btn clay-btn-primary" onClick={() => nav("/s/tutor/lesson/" + lesson.id + "/result?attempt=" + encodeURIComponent(attempt.id))}>
              <Icon name="check" size={16} />ดูผลวิเคราะห์
            </button>
            <button className="clay-btn clay-btn-soft" onClick={() => nav("/s/tutor/lesson/" + lesson.id)}>
              กลับไปหน้าบทเรียน
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- exam ----
  const { questions, attempt } = exam;
  const { answers, cur } = exam;
  const remaining = Math.max(0, Math.ceil((exam.deadlineMs - (nowMs + exam.offset)) / 1000));
  const q = questions[cur];
  const answered = questions.filter((x) => answers[x.id] != null).length;
  const patch = (p) => setExam((e) => ({ ...e, ...p }));
  const go = (i) => patch({ cur: i });

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="clay-sticky-header flex items-center gap-3 mb-4">
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-xs muted" style={{ color: "#64748b" }}>{set.code} · ทำข้อสอบ</div>
          <div className="t-sm fw-7 truncate">บทที่ {lesson.index} · {lesson.title}</div>
        </div>
        <div
          className={"clay-badge " + (timeUp || remaining <= 60 ? "clay-badge-danger" : "clay-badge-primary")}
          style={{ height: 32, padding: "0 14px", fontWeight: 700 }}
          aria-label="เวลาที่เหลือ"
        >
          <Icon name="clock" size={14} />{formatTime(remaining)}
        </div>
        <button
          className="clay-btn clay-btn-primary clay-btn-sm"
          disabled={submitting || timeUp}
          onClick={() => submit(true)}
        >
          <Icon name="check" size={14} />{submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
        </button>
      </div>

      {saveError && (
        <div className="clay-well flex items-start gap-3 mb-3" role="alert" style={{ padding: 14, background: "var(--danger-soft)", color: "var(--danger)" }}>
          <Icon name="alert" size={18} /><div className="t-sm">{saveError}</div>
        </div>
      )}
      {!timeUp && submitError && (
        <div className="clay-well flex items-start gap-3 mb-3" role="alert" style={{ padding: 14, background: "var(--danger-soft)", color: "var(--danger)" }}>
          <Icon name="alert" size={18} /><div className="t-sm">ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่</div>
        </div>
      )}

      {timeUp && (
        <div className="clay-well flex items-start gap-3 mb-3" style={{ padding: 14, background: "var(--danger-soft)", color: "var(--danger)" }}>
          <Icon name="alert" size={18} /><div className="t-sm flex-1">{submitError ? "หมดเวลาแล้ว แต่ส่งคำตอบไม่สำเร็จ กรุณาลองส่งอีกครั้ง" : "หมดเวลาแล้ว กำลังส่งคำตอบ..."}</div>
          {submitError && <button className="clay-btn clay-btn-soft clay-btn-sm" disabled={submitting} onClick={() => submit(false)}>ส่งอีกครั้ง</button>}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexDirection: mobile ? "column" : "row" }}>
        <div className="flex-1" style={{ minWidth: 0, width: "100%" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="t-sm muted" style={{ color: "#64748b" }}>ข้อ <b className="fg">{cur + 1}</b> จาก {questions.length}</div>
            <div className="t-xs muted" style={{ color: "#64748b" }}>ตอบแล้ว {answered}/{questions.length}</div>
          </div>
          <div className="clay-progress mb-4">
            <div className="clay-progress-bar" style={{ width: ((cur + 1) / questions.length * 100) + "%" }} />
          </div>

          <div className="clay-card" style={{ padding: mobile ? 20 : 30 }}>
            <div className="flex items-start gap-3 mb-5">
              <div
                className="clay-well"
                style={{
                  flex: "0 0 38px",
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  color: "var(--primary)",
                  fontSize: 16,
                }}
              >
                {cur + 1}
              </div>
              <div className="t-md fw-6 pretty" style={{ paddingTop: 4, lineHeight: 1.6, fontSize: 16, color: "var(--fg)" }}>
                {q.text}
              </div>
            </div>
            <div className="flex col gap-2.5" style={{ paddingLeft: mobile ? 0 : 50 }}>
              {q.choices.map((ch) => {
                const sel = answers[q.id] === ch.id;
                return (
                  <button
                    key={ch.id}
                    disabled={timeUp}
                    onClick={() => choose(q.id, ch.id)}
                    className={"clay-choice" + (sel ? " selected" : "")}
                  >
                    <span
                      style={{
                        flex: "0 0 22px",
                        width: 22,
                        height: 22,
                        borderRadius: 99,
                        border: "2px solid " + (sel ? "var(--primary)" : "#cbd5e1"),
                        background: sel ? "var(--primary-soft)" : "#ffffff",
                        display: "grid",
                        placeItems: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {sel && <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--primary)" }} />}
                    </span>
                    <span className="t-base flex-1" style={{ fontWeight: sel ? 600 : 400, color: "var(--fg)", lineHeight: 1.5 }}>
                      {ch.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button className="clay-btn clay-btn-soft" disabled={cur === 0} onClick={() => go(cur - 1)}>
              <Icon name="arrL" size={16} />ก่อนหน้า
            </button>
            <button className="clay-btn clay-btn-primary" disabled={cur >= questions.length - 1} onClick={() => go(cur + 1)}>
              ข้อถัดไป<Icon name="arrR" size={16} />
            </button>
          </div>
        </div>

        {/* navigator: the numbers are the locked order of this round */}
        <div
          className="clay-card"
          style={{
            width: mobile ? "100%" : 240,
            flex: mobile ? "1" : "0 0 240px",
            position: mobile ? "static" : "sticky",
            top: 86,
            padding: 20,
          }}
        >
          <div className="t-sm fw-7 mb-1" style={{ fontSize: 15 }}>รายการข้อสอบ</div>
          <div className="t-xs muted mb-3" style={{ color: "#64748b" }}>{questions.length} ข้อ · {attempt.minutes} นาที</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
            {questions.map((qq, i) => {
              const done = answers[qq.id] != null;
              const here = i === cur;
              return (
                <button
                  key={qq.id}
                  onClick={() => go(i)}
                  className={"clay-keycap" + (here ? " active" : done ? " done" : "")}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <hr className="divider mt-4 mb-3" />
          <div className="flex items-center gap-2 t-xs muted mb-2" style={{ color: "#64748b" }}>
            <span style={{ width: 14, height: 14, borderRadius: 5, background: "linear-gradient(135deg, #1084a7 0%, #0d6e8c 100%)" }} /> ตอบแล้ว
          </div>
          <div className="flex items-center gap-2 t-xs muted" style={{ color: "#64748b" }}>
            <span style={{ width: 14, height: 14, borderRadius: 5, background: "#fff", border: "1.5px solid #e2e8f0" }} /> ยังไม่ตอบ
          </div>
        </div>
      </div>
    </div>
  );
}
