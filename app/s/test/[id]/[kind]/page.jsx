"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Dialog } from "@/components/ui/Primitives";

export default function TestTaking() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const lessonId = params?.id;
  const kind = params?.kind || "pre"; // pre | post
  
  const lesson = DATA.lessons.find((l) => l.id === lessonId) || DATA.lessons[0];
  const qs = DATA.questions;
  
  const [cur, setCur] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [flagged, setFlagged] = React.useState({});
  const [confirm, setConfirm] = React.useState(false);
  
  // Default to desktop view
  const mobile = false;
  
  const q = qs[cur];
  const answered = Object.keys(answers).length;

  const choose = (qid, cid) => setAnswers((a) => ({ ...a, [qid]: cid }));
  const submit = () => { nav("/s/test/" + lesson.id + "/" + kind + "/result"); };

  return (
    <div style={{ background: "#f7f9fb", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* exam top bar */}
      <div className="flex items-center gap-3 px-4" style={{ height: 58, flex: "0 0 58px", borderBottom: "1px solid var(--border)", background: "#fff", padding: "0 16px" }}>
        <button className="iconbtn ghost" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="x" size={18} /></button>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-xs muted">{kind === "pre" ? "แบบทดสอบก่อนเรียน (Pre-test)" : "แบบทดสอบหลังเรียน (Post-test)"}</div>
          <div className="t-sm fw-7 truncate">บทที่ {lesson.index} · {lesson.title}</div>
        </div>
        <div className="flex items-center gap-2 badge badge-muted" style={{ height: 30 }}><Icon name="clock" size={14} />28:14</div>
        <button className="btn btn-primary btn-sm hide-m" onClick={() => setConfirm(true)}>ส่งคำตอบ</button>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: mobile ? "16px" : "28px 24px 80px", display: "flex", gap: 24, alignItems: "flex-start", flexDirection: mobile ? "column" : "row" }}>
          {/* question column */}
          <div className="flex-1" style={{ minWidth: 0, width: "100%" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="t-sm muted">ข้อ <b className="fg">{cur + 1}</b> จาก {qs.length}</div>
              <button className={"btn btn-sm " + (flagged[q.id] ? "btn-soft" : "btn-ghost")} onClick={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}>
                <Icon name="flag" size={15} />{flagged[q.id] ? "ทำเครื่องหมายแล้ว" : "ทำเครื่องหมายไว้"}
              </button>
            </div>
            <div className="progress mb-5" style={{ height: 6 }}><i style={{ width: ((cur + 1) / qs.length * 100) + "%" }} /></div>

            <div className="card card-p" style={{ padding: mobile ? 18 : 28 }}>
              <div className="flex items-start gap-3 mb-4">
                <div style={{ flex: "0 0 34px", width: 34, height: 34, borderRadius: 9, background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>{q.no}</div>
                <div className="t-md fw-6 pretty" style={{ paddingTop: 3, lineHeight: 1.55 }}>{q.text}</div>
              </div>
              <div className="flex col gap-2" style={{ paddingLeft: mobile ? 0 : 46 }}>
                {q.choices.map((ch) => {
                  const sel = answers[q.id] === ch.id;
                  return (
                    <button key={ch.id} onClick={() => choose(q.id, ch.id)}
                      style={{ display: "flex", alignItems: "center", gap: 13, textAlign: "left", padding: "13px 15px", borderRadius: 11, cursor: "pointer",
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
              <button className="btn btn-outline" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}><Icon name="arrL" size={16} />ก่อนหน้า</button>
              {cur < qs.length - 1
                ? <button className="btn btn-primary" onClick={() => setCur((c) => c + 1)}>ข้อถัดไป<Icon name="arrR" size={16} /></button>
                : <button className="btn btn-primary" onClick={() => setConfirm(true)}><Icon name="check" size={16} />ส่งคำตอบ</button>}
            </div>
          </div>

          {/* navigator palette */}
          <div className="card card-p" style={{ width: mobile ? "100%" : 230, flex: mobile ? "1" : "0 0 230px", position: mobile ? "static" : "sticky", top: 20 }}>
            <div className="t-sm fw-7 mb-1">รายการข้อสอบ</div>
            <div className="t-xs muted mb-3">ตอบแล้ว {answered}/{qs.length} ข้อ</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
              {qs.map((qq, i) => {
                const done = answers[qq.id]; const here = i === cur; const fl = flagged[qq.id];
                return (
                  <button key={qq.id} onClick={() => setCur(i)} style={{ position: "relative", aspectRatio: "1", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13,
                    border: "1.5px solid " + (here ? "var(--primary)" : done ? "transparent" : "var(--border-strong)"),
                    background: done ? "var(--primary)" : "#fff", color: done ? "#fff" : "var(--fg)" }}>
                    {i + 1}
                    {fl && <span style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: 99, background: "var(--warning)", border: "2px solid #fff" }} />}
                  </button>
                );
              })}
            </div>
            <hr className="divider mt-4 mb-3" />
            <div className="flex items-center gap-2 t-xs muted mb-2"><span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--primary)" }} /> ตอบแล้ว</div>
            <div className="flex items-center gap-2 t-xs muted mb-2"><span style={{ width: 12, height: 12, borderRadius: 4, border: "1.5px solid var(--border-strong)" }} /> ยังไม่ตอบ</div>
            <div className="flex items-center gap-2 t-xs muted"><span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--warning)" }} /> ทำเครื่องหมายไว้</div>
            <button className="btn btn-primary btn-block mt-4" onClick={() => setConfirm(true)}><Icon name="send" size={15} />ส่งคำตอบ</button>
          </div>
        </div>
      </div>

      {confirm && (
        <Dialog title="ยืนยันการส่งคำตอบ?" desc={`คุณตอบแล้ว ${answered} จาก ${qs.length} ข้อ` + (answered < qs.length ? ` · ยังเหลืออีก ${qs.length - answered} ข้อที่ยังไม่ได้ตอบ` : "")}
          onClose={() => setConfirm(false)}
          footer={<><button className="btn btn-outline" onClick={() => setConfirm(false)}>กลับไปทำต่อ</button><button className="btn btn-primary" onClick={submit}><Icon name="check" size={16} />ยืนยันส่งคำตอบ</button></>}>
          {answered < qs.length
            ? <div className="flex items-start gap-3" style={{ padding: 14, borderRadius: 10, background: "var(--warning-soft)", color: "var(--warning)" }}><Icon name="alert" size={18} /><div className="t-sm">เมื่อส่งแล้วจะไม่สามารถแก้ไขคำตอบได้ ข้อที่ไม่ได้ตอบจะถือว่าผิด</div></div>
            : <div className="flex items-start gap-3" style={{ padding: 14, borderRadius: 10, background: "var(--success-soft)", color: "var(--success)" }}><Icon name="checkC" size={18} /><div className="t-sm">คุณตอบครบทุกข้อแล้ว เมื่อส่งแล้วจะไม่สามารถแก้ไขได้</div></div>}
        </Dialog>
      )}
    </div>
  );
}
