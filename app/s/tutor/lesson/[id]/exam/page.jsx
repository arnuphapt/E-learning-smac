"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import { useIsMobile } from "@/lib/hooks";
import { firstUnansweredIndex } from "@/lib/tutor-attempt";

// Tutor exam of one lesson. Data from /api/tutor/lessons/<id>/attempt:
//   GET  -> question count + minutes (pre-start screen) and whether a round is already open
//   POST -> start or resume; the payload holds ONLY this student's locked questions (no answers / explanations)
// One clock for the whole round, counted down from the server's deadline_at (server time offset, no sessionStorage).
// Closing the page and coming back resumes the same round: the questions, their order and the deadline are all server-side.

const attemptUrl = (id) => "/api/tutor/lessons/" + encodeURIComponent(id) + "/attempt";
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
            setExam(toExam(await rr.json()));
            setNowMs(Date.now());
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

  async function start() {
    setBusy(true);
    try {
      const r = await post(id, {});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(d.state === "empty" ? "บทนี้ยังไม่มีข้อสอบ" : "เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่", "error");
        return;
      }
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
      <div className="container">
        <Crumb nav={nav} items={crumb} />
        <div className="card card-p" style={{ maxWidth: 560 }}>
          <div className="flex items-center gap-2 mb-2"><Badge tone="primary">{set.code}</Badge><Badge tone="outline">ชุดติว</Badge></div>
          <div className="t-xl fw-7 serif mb-1">{lesson.title}</div>
          <div className="muted t-sm mb-4">บทที่ {lesson.index}</div>
          {notice && (
            <div className="flex items-start gap-3 mb-4" style={{ padding: 14, borderRadius: 10, background: "var(--warning-soft)", color: "var(--warning)" }}>
              <Icon name="alert" size={18} /><div className="t-sm">{notice}</div>
            </div>
          )}
          {pre.count === 0 ? (
            <div className="t-sm muted mb-2">บทนี้ยังไม่มีข้อสอบ</div>
          ) : (
            <>
              <div className="flex gap-4 mb-4 wrap">
                <div><div className="t-xs muted">จำนวนข้อ</div><div className="t-xl fw-7">{pre.count} ข้อ</div></div>
                <div><div className="t-xs muted">เวลาทั้งหมด</div><div className="t-xl fw-7">{pre.minutes} นาที</div></div>
              </div>
              <ul className="t-sm muted pretty" style={{ margin: "0 0 20px", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>เวลา 1 นาทีต่อข้อ นับรวมทั้งชุดเป็นนาฬิกาเดียว</li>
                <li>นาฬิกาเริ่มเมื่อคุณกดเริ่ม และเดินต่อแม้ปิดหน้าจอหรือเน็ตหลุด</li>
                <li>ชุดข้อสุ่มใหม่ทุกรอบ ถ้ากลับเข้ามาระหว่างทำจะได้รอบเดิมต่อ</li>
              </ul>
              <button className="btn btn-primary" disabled={busy} onClick={start}>
                <Icon name="play" size={16} />{busy ? "กำลังเริ่ม..." : "เริ่มทำข้อสอบ"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- exam ----
  const { questions, attempt } = exam;
  const { answers, cur } = exam;
  const remaining = Math.max(0, Math.ceil((exam.deadlineMs - (nowMs + exam.offset)) / 1000));
  const timeUp = remaining <= 0;
  const q = questions[cur];
  const answered = questions.filter((x) => answers[x.id] != null).length;
  const patch = (p) => setExam((e) => ({ ...e, ...p }));
  const go = (i) => patch({ cur: i });
  // Seam for ticket 04: persist the choice on the server here (POST the answer, the server rejects it after the
  // deadline) and then update local state. Until then a choice lives only in this page's state.
  const choose = (qid, cid) => { if (!timeUp) patch({ answers: { ...answers, [qid]: cid } }); };

  return (
    <div className="container">
      <div className="flex items-center gap-3 mb-3" style={{ position: "sticky", top: 0, zIndex: 5, background: "#fff", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-xs muted">{set.code} · ทำข้อสอบ</div>
          <div className="t-sm fw-7 truncate">บทที่ {lesson.index} · {lesson.title}</div>
        </div>
        <div className={"flex items-center gap-2 badge " + (timeUp ? "badge-danger" : "badge-muted")} style={{ height: 30 }} aria-label="เวลาที่เหลือ">
          <Icon name="clock" size={14} />{formatTime(remaining)}
        </div>
        {/* ticket 04: submit button + confirm dialog go here */}
      </div>

      {timeUp && (
        <div className="flex items-start gap-3 mb-3" style={{ padding: 14, borderRadius: 10, background: "var(--danger-soft)", color: "var(--danger)" }}>
          <Icon name="alert" size={18} /><div className="t-sm">หมดเวลาแล้ว ไม่สามารถตอบหรือแก้คำตอบได้อีก</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexDirection: mobile ? "column" : "row" }}>
        <div className="flex-1" style={{ minWidth: 0, width: "100%" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="t-sm muted">ข้อ <b className="fg">{cur + 1}</b> จาก {questions.length}</div>
            <div className="t-xs muted">ตอบแล้ว {answered}/{questions.length}</div>
          </div>
          <div className="progress mb-5" style={{ height: 6 }}><i style={{ width: ((cur + 1) / questions.length * 100) + "%" }} /></div>

          <div className="card card-p" style={{ padding: mobile ? 18 : 28 }}>
            <div className="flex items-start gap-3 mb-4">
              <div style={{ flex: "0 0 34px", width: 34, height: 34, borderRadius: 9, background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>{cur + 1}</div>
              <div className="t-md fw-6 pretty" style={{ paddingTop: 3, lineHeight: 1.55 }}>{q.text}</div>
            </div>
            <div className="flex col gap-2" style={{ paddingLeft: mobile ? 0 : 46 }}>
              {q.choices.map((ch) => {
                const sel = answers[q.id] === ch.id;
                return (
                  <button key={ch.id} disabled={timeUp} onClick={() => choose(q.id, ch.id)}
                    style={{ display: "flex", alignItems: "center", gap: 13, textAlign: "left", padding: "13px 15px", borderRadius: 11, cursor: timeUp ? "default" : "pointer",
                      border: "1.5px solid " + (sel ? "var(--primary)" : "var(--border-strong)"), background: sel ? "var(--primary-soft)" : "#fff", transition: ".12s" }}>
                    <span style={{ flex: "0 0 22px", width: 22, height: 22, borderRadius: 99, border: "2px solid " + (sel ? "var(--primary)" : "#cbd5e1"), display: "grid", placeItems: "center" }}>
                      {sel && <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--primary)" }} />}
                    </span>
                    <span className="t-base" style={{ fontWeight: sel ? 600 : 400 }}>{ch.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button className="btn btn-outline" disabled={cur === 0} onClick={() => go(cur - 1)}><Icon name="arrL" size={16} />ก่อนหน้า</button>
            <button className="btn btn-primary" disabled={cur >= questions.length - 1} onClick={() => go(cur + 1)}>ข้อถัดไป<Icon name="arrR" size={16} /></button>
          </div>
        </div>

        {/* navigator: the numbers are the locked order of this round */}
        <div className="card card-p" style={{ width: mobile ? "100%" : 230, flex: mobile ? "1" : "0 0 230px", position: mobile ? "static" : "sticky", top: 78 }}>
          <div className="t-sm fw-7 mb-1">รายการข้อสอบ</div>
          <div className="t-xs muted mb-3">{attempt.count} ข้อ · {attempt.minutes} นาที</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
            {questions.map((qq, i) => {
              const done = answers[qq.id] != null; const here = i === cur;
              return (
                <button key={qq.id} onClick={() => go(i)} style={{ aspectRatio: "1", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  border: "1.5px solid " + (here ? "var(--primary)" : done ? "transparent" : "var(--border-strong)"),
                  background: done ? "var(--primary)" : "#fff", color: done ? "#fff" : "var(--fg)" }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <hr className="divider mt-4 mb-3" />
          <div className="flex items-center gap-2 t-xs muted mb-2"><span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--primary)" }} /> ตอบแล้ว</div>
          <div className="flex items-center gap-2 t-xs muted"><span style={{ width: 12, height: 12, borderRadius: 4, border: "1.5px solid var(--border-strong)" }} /> ยังไม่ตอบ</div>
        </div>
      </div>
    </div>
  );
}
