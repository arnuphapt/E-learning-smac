"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Avatar, Badge, Progress, Ph, statusBadge } from "@/components/ui/Primitives";

export default function Grading() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);
  const toast = (msg) => alert(msg);

  const subId = params?.id;
  const sub = DATA.submissions.find((s) => s.id === subId) || DATA.submissions[1];
  const student = DATA.students.find((s) => s.id === sub.studentId);
  const a = DATA.assignments.find((x) => x.id === sub.assignmentId);
  const rubric = DATA.rubric;
  
  const [scores, setScores] = React.useState(() => Object.fromEntries(rubric.criteria.map((c) => [c.id, sub.score != null ? Math.round(sub.score / a.points * c.max) : 0])));
  const [feedback, setFeedback] = React.useState(sub.score != null ? "งานเขียนกระบวนการพยาบาลครบถ้วน จัดลำดับความสำคัญได้ดี ควรเพิ่มการอ้างอิงหลักฐานเชิงประจักษ์ที่ทันสมัย" : "");
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  
  const mobile = false;

  // navigation between submissions
  const gradable = DATA.submissions.filter((s) => s.status !== "not-submitted");
  const idx = gradable.findIndex((s) => s.id === sub.id);

  return (
    <div style={{ background: "#f4f6f8", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center gap-3 px-4" style={{ height: 56, flex: "0 0 56px", borderBottom: "1px solid var(--border)", background: "#fff", padding: "0 16px" }}>
        <button className="iconbtn ghost" onClick={() => nav("/i/submissions/" + a.id)}><Icon name="arrL" size={18} /></button>
        <div className="flex-1" style={{ minWidth: 0 }}><div className="t-xs muted truncate">{a.title}</div><div className="t-sm fw-7 truncate">ตรวจงาน — {student.name}</div></div>
        <span className="t-xs muted hide-m">งานที่ {idx + 1}/{gradable.length}</span>
        <button className="iconbtn ghost hide-m" disabled={idx <= 0} onClick={() => nav("/i/grade/" + gradable[idx - 1].id)}><Icon name="chevL" size={18} /></button>
        <button className="iconbtn ghost hide-m" disabled={idx >= gradable.length - 1} onClick={() => nav("/i/grade/" + gradable[idx + 1].id)}><Icon name="chevR" size={18} /></button>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", height: "100%", flexDirection: mobile ? "column" : "row" }}>
          {/* document viewer */}
          <div className="flex-1" style={{ minWidth: 0, padding: mobile ? 16 : 24, overflow: "auto" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Avatar name={student.name} size={34} /><div><div className="fw-6">{student.name}</div><div className="t-xs muted">{student.no} · {student.sec}</div></div></div>
              <div className="flex items-center gap-2">{sub.late && <Badge tone="warning" dot>ส่งล่าช้า</Badge>}{statusBadge(sub.status)}</div>
            </div>
            <div className="card card-p mb-3 flex items-center gap-3">
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="file" size={18} /></div>
              <div className="flex-1"><div className="t-sm fw-6">{sub.file}</div><div className="t-xs muted">ส่งเมื่อ {sub.at} · PDF 1.8 MB</div></div>
              <button className="btn btn-outline btn-sm"><Icon name="download" size={14} />ดาวน์โหลด</button>
            </div>
            <Ph label="ตัวอย่างเอกสารงานนักศึกษา (PDF preview)" h={mobile ? 320 : 520} />
          </div>

          {/* grading panel */}
          <div style={{ width: mobile ? "100%" : 380, flex: mobile ? "1" : "0 0 380px", borderLeft: mobile ? 0 : "1px solid var(--border)", background: "#fff", overflow: "auto", padding: 20 }}>
            <div className="flex items-center justify-between mb-1"><div className="t-md fw-7 flex items-center gap-2"><Icon name="target" size={17} className="c-primary" />ให้คะแนนตาม Rubric</div></div>
            <div className="t-xs muted mb-4">{rubric.title}</div>

            <div className="flex col gap-3">
              {rubric.criteria.map((c) => (
                <div key={c.id} style={{ padding: 13, border: "1px solid var(--border)", borderRadius: 12 }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div><div className="t-sm fw-6">{c.name}</div><div className="t-xs muted pretty">{c.desc}</div></div>
                    <div className="t-sm fw-7 tnum" style={{ whiteSpace: "nowrap" }}><span className="c-primary">{scores[c.id]}</span><span className="muted">/{c.max}</span></div>
                  </div>
                  <div className="flex gap-1 wrap">
                    {Array.from({ length: c.max + 1 }).map((_, n) => (
                      <button key={n} onClick={() => setScores((s) => ({ ...s, [c.id]: n }))}
                        style={{ flex: 1, minWidth: 30, height: 32, borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
                          border: "1px solid " + (scores[c.id] === n ? "var(--primary)" : "var(--border-strong)"),
                          background: scores[c.id] === n ? "var(--primary)" : "#fff", color: scores[c.id] === n ? "#fff" : "var(--muted-fg)" }}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="field mt-4"><label className="label flex items-center gap-2"><Icon name="msg" size={15} className="c-primary" />ข้อเสนอแนะถึงนักศึกษา</label>
              <textarea className="input" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="เขียนคำแนะนำ จุดเด่น และสิ่งที่ควรพัฒนา…" /></div>

            <div className="card bg-muted" style={{ border: 0, padding: 14, marginTop: 4 }}>
              <div className="flex items-center justify-between"><span className="t-sm muted">คะแนนรวม</span><span className="t-2xl fw-7 c-primary tnum">{total}<span className="t-md muted fw-5">/{a.points}</span></span></div>
              <div className="mt-2"><Progress value={total / a.points * 100} /></div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn btn-outline flex-1" onClick={() => toast("บันทึกฉบับร่างแล้ว")}>บันทึกร่าง</button>
              <button className="btn btn-primary flex-1" onClick={() => { toast("ส่งคะแนนและข้อเสนอแนะแล้ว"); setTimeout(() => idx < gradable.length - 1 ? nav("/i/grade/" + gradable[idx + 1].id) : nav("/i/submissions/" + a.id), 700); }}><Icon name="check" size={15} />ให้คะแนน</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
