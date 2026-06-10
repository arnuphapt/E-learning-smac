"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Ring } from "@/components/ui/Primitives";

export default function TestResult() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const lessonId = params?.id;
  const kind = params?.kind || "pre";
  
  const lesson = DATA.lessons.find((l) => l.id === lessonId) || DATA.lessons[0];
  const qs = DATA.questions;
  
  const score = kind === "pre" ? 7 : 9;
  const total = qs.length > 5 ? qs.length : 10;
  const correct = kind === "pre" ? 7 : 9, wrong = total - correct;
  
  const mobile = false;

  return (
    <div style={{ background: "#f7f9fb", minHeight: '100vh' }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: mobile ? "20px 16px 64px" : "40px 24px 80px" }}>
        <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(120deg,var(--primary),#0a5d77)", padding: mobile ? "24px 20px" : "32px 36px", color: "#fff" }}>
            <div className="flex items-center gap-2 t-sm" style={{ opacity: .85 }}>
              <Icon name="checkC" size={16} />ส่งคำตอบเรียบร้อยแล้ว
            </div>
            <div className="t-xl fw-7 mt-1">{kind === "pre" ? "ผลแบบทดสอบก่อนเรียน" : "ผลแบบทดสอบหลังเรียน"}</div>
            <div className="t-sm mt-1" style={{ opacity: .85 }}>บทที่ {lesson.index} · {lesson.title}</div>
          </div>
          <div className="card-p flex items-center gap-6 wrap" style={{ padding: mobile ? 20 : 28 }}>
            <Ring value={score} total={total} size={mobile ? 116 : 140} label={"จาก " + total + " คะแนน"} />
            <div className="flex-1" style={{ minWidth: 220 }}>
              <div className="grid grid-2 gap-3">
                <div className="card bg-muted" style={{ border: 0, padding: 14 }}>
                  <div className="flex items-center gap-2 c-success"><Icon name="checkC" size={16} /><span className="t-xs fw-6">ตอบถูก</span></div>
                  <div className="t-2xl fw-7 mt-1 tnum">{correct} <span className="muted t-sm fw-5">ข้อ</span></div>
                </div>
                <div className="card bg-muted" style={{ border: 0, padding: 14 }}>
                  <div className="flex items-center gap-2 c-danger"><Icon name="xC" size={16} /><span className="t-xs fw-6">ตอบผิด</span></div>
                  <div className="t-2xl fw-7 mt-1 tnum">{wrong} <span className="muted t-sm fw-5">ข้อ</span></div>
                </div>
              </div>
              {kind === "post"
                ? <div className="flex items-center gap-2 mt-3 t-sm" style={{ padding: "10px 13px", borderRadius: 10, background: "var(--success-soft)", color: "var(--success)" }}><Icon name="chart" size={16} />พัฒนาการจาก Pre-test: <b>+2 คะแนน</b> (7 → 9)</div>
                : <div className="flex items-center gap-2 mt-3 t-sm muted pretty"><Icon name="sparkle" size={16} className="c-primary" />คะแนนนี้ใช้เพื่อประเมินความรู้พื้นฐานก่อนเรียน ระบบได้ปลดล็อกวิดีโอบทเรียนให้แล้ว</div>}
            </div>
          </div>
        </div>

        {/* review */}
        <div className="flex items-center justify-between mb-3">
          <div className="t-md fw-7">เฉลยและคำอธิบาย</div>
          <span className="t-xs muted">{qs.length} ข้อ</span>
        </div>
        <div className="flex col gap-3">
          {qs.map((q, i) => {
            const isCorrect = i < correct;
            const chosen = isCorrect ? q.answer : (q.choices.find((c) => c.id !== q.answer) || {}).id;
            return (
              <div key={q.id} className="card card-p">
                <div className="flex items-start gap-3">
                  <div style={{ flex: "0 0 26px", width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center",
                    background: isCorrect ? "var(--success-soft)" : "var(--danger-soft)", color: isCorrect ? "var(--success)" : "var(--danger)" }}>
                    <Icon name={isCorrect ? "check" : "x"} size={15} />
                  </div>
                  <div className="flex-1">
                    <div className="t-sm fw-6 pretty">{q.no}. {q.text}</div>
                    <div className="flex col gap-1 mt-2">
                      {q.choices.map((ch) => {
                        const right = ch.id === q.answer; const picked = ch.id === chosen;
                        const wrongPick = picked && !right;
                        return (
                          <div key={ch.id} className="flex items-center gap-2 t-sm" style={{ padding: "6px 10px", borderRadius: 8,
                            background: right ? "var(--success-soft)" : wrongPick ? "var(--danger-soft)" : "transparent",
                            color: right ? "var(--success)" : wrongPick ? "var(--danger)" : "var(--muted-fg)", fontWeight: right || wrongPick ? 600 : 400 }}>
                            {right ? <Icon name="check" size={14} /> : wrongPick ? <Icon name="x" size={14} /> : <span style={{ width: 14 }} />}
                            {ch.text}{picked && <span className="t-xs" style={{ opacity: .7 }}>· คำตอบของคุณ</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 gap-3 wrap">
          <button className="btn btn-outline" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="arrL" size={16} />กลับสู่บทเรียน</button>
          {kind === "pre"
            ? <button className="btn btn-primary btn-lg" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="playC" size={17} />เริ่มชมวิดีโอบทเรียน</button>
            : <button className="btn btn-primary btn-lg" onClick={() => nav("/s/course/" + lesson.courseId)}>ไปบทเรียนถัดไป<Icon name="arrR" size={16} /></button>}
        </div>
      </div>
    </div>
  );
}
