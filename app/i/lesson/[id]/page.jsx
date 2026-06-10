"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, Avatar, Dialog, Ph, statusBadge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";

function ToggleRow({ label, on }) {
  const [v, setV] = React.useState(on);
  return (
    <div className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="t-sm pretty" style={{ paddingRight: 12 }}>{label}</span>
      <button onClick={() => setV(!v)} style={{ width: 40, height: 23, borderRadius: 99, border: 0, cursor: "pointer", padding: 2, background: v ? "var(--primary)" : "#cbd5e1", transition: ".15s", flex: "0 0 40px" }}>
        <span style={{ display: "block", width: 19, height: 19, borderRadius: 99, background: "#fff", transform: v ? "translateX(17px)" : "translateX(0)", transition: ".15s" }} />
      </button>
    </div>
  );
}

function Chk({ label, on }) {
  const [v, setV] = React.useState(on);
  return (
    <button onClick={() => setV(!v)} className="flex items-center gap-2 t-sm" style={{ padding: "8px 12px", borderRadius: 9, cursor: "pointer", border: "1px solid " + (v ? "var(--primary)" : "var(--border-strong)"), background: v ? "var(--primary-soft)" : "#fff", fontWeight: v ? 600 : 400, color: v ? "var(--primary-soft-fg)" : "var(--fg)" }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid " + (v ? "var(--primary)" : "#cbd5e1"), background: v ? "var(--primary)" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>{v && <Icon name="check" size={13} />}</span>
      {label}
    </button>
  );
}

function VideoManage({ lesson, toast }) {
  return (
    <div className="flex gap-5 items-start wrap">
      <div className="flex-1" style={{ minWidth: 280 }}>
        <div className="card mb-4">
          <div className="card-h"><div className="title">คลิปการสอน</div><div className="desc">อัปโหลดหรือลิงก์วิดีโอบทเรียน</div></div>
          <div className="card-p">
            <Ph label="วิดีโอบทเรียน · 16:9" h={200} style={{ marginBottom: 16 }} />
            <div className="flex items-center gap-3" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 11 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="video" size={17} /></div>
              <div className="flex-1"><div className="t-sm fw-6">heart_failure_lecture.mp4</div><div className="t-xs muted">42:18 นาที · 480 MB · อัปโหลดแล้ว</div></div>
              <button className="btn btn-outline btn-sm"><Icon name="refresh" size={14} />เปลี่ยน</button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="title">รายละเอียดบทเรียน</div></div>
          <div className="card-p">
            <div className="field"><label className="label">ชื่อบทเรียน</label><input className="input" defaultValue={lesson.title} /></div>
            <div className="field"><label className="label">คำอธิบาย</label><textarea className="input" rows={3} defaultValue={lesson.desc} /></div>
            <div className="grid grid-2 gap-3">
              <div className="field" style={{ margin: 0 }}><label className="label">ความยาว</label><input className="input" defaultValue={lesson.duration} /></div>
              <div className="field" style={{ margin: 0 }}><label className="label">สถานะการเผยแพร่</label><select className="input"><option>เผยแพร่แล้ว</option><option>ฉบับร่าง</option></select></div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ width: 300, flex: "0 0 300px" }}>
        <div className="card card-p">
          <div className="t-sm fw-7 mb-3">การตั้งค่าการเข้าถึง</div>
          <ToggleRow label="ต้องทำ Pre-test ก่อนดูวิดีโอ" on={lesson.pretest.required} />
          <ToggleRow label="ต้องทำ Post-test หลังเรียน" on={lesson.posttest.required} />
          <ToggleRow label="ดูวิดีโอครบ 80% ก่อนทำ Post-test" on={true} />
          <ToggleRow label="อนุญาตให้ดาวน์โหลดเอกสาร" on={true} />
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ q, onClose, onSave }) {
  const [text, setText] = React.useState(q.text);
  const [choices, setChoices] = React.useState(q.choices);
  const [answer, setAnswer] = React.useState(q.answer);
  const setC = (id, v) => setChoices((cs) => cs.map((c) => c.id === id ? { ...c, text: v } : c));
  const addC = () => { const id = String.fromCharCode(97 + choices.length); setChoices([...choices, { id, text: "" }]); };
  return (
    <Dialog title={q.text ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"} desc="ข้อสอบปรนัย เลือกคำตอบที่ถูกต้อง 1 ข้อ" onClose={onClose} lg
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={() => onSave({ ...q, text, choices, answer })}><Icon name="check" size={15} />บันทึกข้อสอบ</button></>}>
      <div className="field"><label className="label">โจทย์คำถาม</label><textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์โจทย์คำถาม…" /></div>
      <label className="label">ตัวเลือก <span className="muted fw-4">— เลือกวงกลมเพื่อกำหนดคำตอบที่ถูกต้อง</span></label>
      <div className="flex col gap-2 mb-2">
        {choices.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <button onClick={() => setAnswer(c.id)} style={{ width: 24, height: 24, borderRadius: 99, border: "2px solid " + (answer === c.id ? "var(--success)" : "#cbd5e1"), background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", flex: "0 0 24px" }}>
              {answer === c.id && <span style={{ width: 11, height: 11, borderRadius: 99, background: "var(--success)" }} />}
            </button>
            <input className="input" value={c.text} onChange={(e) => setC(c.id, e.target.value)} placeholder={"ตัวเลือก " + c.id.toUpperCase()} />
            {choices.length > 2 && <button className="iconbtn ghost c-danger" onClick={() => setChoices(choices.filter((x) => x.id !== c.id))}><Icon name="trash" size={15} /></button>}
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm c-primary" onClick={addC}><Icon name="plus" size={15} />เพิ่มตัวเลือก</button>
    </Dialog>
  );
}

function TestBuilder({ lesson, toast, nav }) {
  const [which, setWhich] = React.useState("pre");
  const [qs, setQs] = React.useState(DATA.questions.slice(0, 3));
  const [editing, setEditing] = React.useState(null);
  return (
    <div className="flex gap-5 items-start wrap">
      <div className="flex-1" style={{ minWidth: 300 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="tabs pill">
            <button className={which === "pre" ? "on" : ""} onClick={() => setWhich("pre")}>Pre-test</button>
            <button className={which === "post" ? "on" : ""} onClick={() => setWhich("post")}>Post-test</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ no: qs.length + 1, type: "single", text: "", choices: [{ id: "a", text: "" }, { id: "b", text: "" }], answer: "a" })}><Icon name="plus" size={15} />เพิ่มข้อสอบ</button>
        </div>
        <div className="flex col gap-3">
          {qs.map((q, i) => (
            <div key={q.id} className="card card-p">
              <div className="flex items-start gap-3">
                <div className="iconbtn ghost" style={{ cursor: "grab", marginTop: -4 }}><Icon name="more" size={16} style={{ transform: "rotate(90deg)" }} /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2"><Badge tone="primary">ข้อ {i + 1}</Badge><Badge tone="outline">{q.type === "truefalse" ? "ถูก/ผิด" : "ปรนัย"}</Badge><span className="t-xs muted ml-auto">1 คะแนน</span></div>
                  <div className="t-sm fw-6 pretty mb-2">{q.text}</div>
                  <div className="flex col gap-1">
                    {q.choices.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 t-sm" style={{ color: c.id === q.answer ? "var(--success)" : "var(--muted-fg)", fontWeight: c.id === q.answer ? 600 : 400 }}>
                        <Icon name={c.id === q.answer ? "checkC" : "circle"} size={14} />{c.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex col gap-1">
                  <button className="iconbtn ghost" onClick={() => setEditing(q)}><Icon name="pencil" size={15} /></button>
                  <button className="iconbtn ghost c-danger" onClick={() => setQs(qs.filter((x) => x.id !== q.id))}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            </div>
          ))}
          <button className="card card-p flex items-center justify-center gap-2 pointer muted" style={{ borderStyle: "dashed", background: "#fbfcfd" }} onClick={() => setEditing({ no: qs.length + 1, type: "single", text: "", choices: [{ id: "a", text: "" }, { id: "b", text: "" }], answer: "a" })}>
            <Icon name="plus" size={16} />เพิ่มข้อสอบใหม่
          </button>
        </div>
      </div>
      <div style={{ width: 300, flex: "0 0 300px" }}>
        <div className="card card-p">
          <div className="t-sm fw-7 mb-3">ตั้งค่าแบบทดสอบ {which === "pre" ? "ก่อนเรียน" : "หลังเรียน"}</div>
          <div className="field"><label className="label">คะแนนผ่าน (%)</label><input className="input" defaultValue={which === "pre" ? "—" : "60"} /></div>
          <div className="field"><label className="label">เวลาทำ (นาที)</label><input className="input" defaultValue="30" /></div>
          <div className="field"><label className="label">จำนวนครั้งที่ทำได้</label><select className="input"><option>1 ครั้ง</option><option>2 ครั้ง</option><option>ไม่จำกัด</option></select></div>
          <ToggleRow label="สลับลำดับข้อสอบ" on={true} />
          <ToggleRow label="แสดงเฉลยหลังส่ง" on={true} />
          <div className="flex items-center justify-between mt-3 t-sm"><span className="muted">รวม</span><span className="fw-7">{qs.length} ข้อ · {qs.length} คะแนน</span></div>
          <button className="btn btn-primary btn-block mt-3" onClick={() => toast("บันทึกแบบทดสอบแล้ว")}><Icon name="check" size={15} />บันทึกแบบทดสอบ</button>
        </div>
      </div>
      {editing && <QuestionEditor q={editing} onClose={() => setEditing(null)} onSave={(nq) => {
        setQs((prev) => prev.find((x) => x.id === nq.id) ? prev.map((x) => x.id === nq.id ? nq : x) : [...prev, { ...nq, id: "q" + Date.now() }]);
        setEditing(null); toast("บันทึกข้อสอบแล้ว");
      }} />}
    </div>
  );
}

function AssignmentBuilder({ lesson, toast, nav }) {
  const a = DATA.assignments[0];
  const [criteria, setCriteria] = React.useState(DATA.rubric.criteria);
  const total = criteria.reduce((s, c) => s + c.max, 0);
  const setMax = (id, v) => setCriteria((cs) => cs.map((c) => c.id === id ? { ...c, max: Math.max(0, +v || 0) } : c));
  const setName = (id, v) => setCriteria((cs) => cs.map((c) => c.id === id ? { ...c, name: v } : c));
  const add = () => setCriteria([...criteria, { id: "rc" + Date.now(), name: "", desc: "", max: 5 }]);

  return (
    <div className="flex gap-5 items-start wrap">
      <div className="flex-1" style={{ minWidth: 300 }}>
        <div className="card mb-4">
          <div className="card-h"><div className="title">รายละเอียดใบงาน</div></div>
          <div className="card-p">
            <div className="field"><label className="label">ชื่อใบงาน</label><input className="input" defaultValue={a.title} /></div>
            <div className="field"><label className="label">คำชี้แจง</label><textarea className="input" rows={4} defaultValue={a.instructions} /></div>
            <div className="grid grid-3 gap-3">
              <div className="field" style={{ margin: 0 }}><label className="label">กำหนดส่ง</label><input className="input" type="text" defaultValue="2025-06-20" /></div>
              <div className="field" style={{ margin: 0 }}><label className="label">เวลา</label><input className="input" defaultValue="23:59" /></div>
              <div className="field" style={{ margin: 0 }}><label className="label">คะแนนเต็ม</label><input className="input" value={total} readOnly /></div>
            </div>
            <label className="label mt-2">รูปแบบการส่งงาน</label>
            <div className="flex gap-2 wrap">
              <Chk label="แนบไฟล์ (PDF/DOCX/รูปภาพ)" on={true} />
              <Chk label="พิมพ์คำตอบเป็นข้อความ" on={true} />
              <Chk label="อนุญาตให้ส่งล่าช้า" on={false} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h flex items-center justify-between">
            <div><div className="title flex items-center gap-2"><Icon name="target" size={16} className="c-primary" />เกณฑ์การให้คะแนน (Rubric)</div><div className="desc">กำหนดเกณฑ์ย่อยและคะแนนเต็มของแต่ละเกณฑ์</div></div>
            <Badge tone="primary">รวม {total} คะแนน</Badge>
          </div>
          <div className="card-p">
            <div className="flex col gap-2">
              {criteria.map((c, i) => (
                <div key={c.id} className="flex items-start gap-2" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 11, background: "#fbfcfd" }}>
                  <div className="iconbtn ghost" style={{ cursor: "grab", marginTop: 2 }}><Icon name="more" size={15} style={{ transform: "rotate(90deg)" }} /></div>
                  <div className="flex-1">
                    <input className="input mb-2" value={c.name} onChange={(e) => setName(c.id, e.target.value)} placeholder={"เกณฑ์ที่ " + (i + 1)} style={{ fontWeight: 600 }} />
                    <input className="input" defaultValue={c.desc} placeholder="คำอธิบายเกณฑ์ (ระดับคะแนนเต็ม)" style={{ height: 34, fontSize: 13 }} />
                  </div>
                  <div style={{ width: 92, flex: "0 0 92px" }}>
                    <label className="t-xs muted mb-1 block">คะแนนเต็ม</label>
                    <input className="input center fw-7" value={c.max} onChange={(e) => setMax(c.id, e.target.value)} />
                  </div>
                  <button className="iconbtn ghost c-danger" style={{ marginTop: 20 }} onClick={() => setCriteria(criteria.filter((x) => x.id !== c.id))}><Icon name="trash" size={15} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm c-primary mt-3" onClick={add}><Icon name="plus" size={15} />เพิ่มเกณฑ์</button>
          </div>
        </div>
      </div>

      <div style={{ width: 290, flex: "0 0 290px" }}>
        <div className="card card-p">
          <div className="t-sm fw-7 mb-3">สรุป</div>
          <div className="flex items-center justify-between t-sm mb-2"><span className="muted">จำนวนเกณฑ์</span><span className="fw-6">{criteria.length}</span></div>
          <div className="flex items-center justify-between t-sm mb-2"><span className="muted">คะแนนเต็ม</span><span className="fw-7 c-primary">{total}</span></div>
          <hr className="divider mt-3 mb-3" />
          <div className="t-xs muted lead pretty">นักศึกษาจะเห็นเกณฑ์เหล่านี้ก่อนส่งงาน และเห็นคะแนนรายเกณฑ์เมื่ออาจารย์ตรวจเสร็จ</div>
          <button className="btn btn-primary btn-block mt-4" onClick={() => toast("บันทึกใบงานและ Rubric แล้ว")}><Icon name="check" size={15} />บันทึกใบงาน</button>
          <button className="btn btn-outline btn-block mt-2" onClick={() => nav("/i/submissions/a1")}><Icon name="users" size={15} />ดูการส่งงาน</button>
        </div>
      </div>
    </div>
  );
}

function SubmissionMini({ nav }) {
  const subs = DATA.submissions;
  const sById = (id) => DATA.students.find((s) => s.id === id);
  return (
    <div className="card">
      <div className="card-h flex items-center justify-between"><div className="title">ใบงานที่ 1 — กรณีศึกษาผู้ป่วยหัวใจล้มเหลว</div>
        <button className="btn btn-primary btn-sm" onClick={() => nav("/i/submissions/a1")}>ดูทั้งหมด<Icon name="arrR" size={14} /></button></div>
      <table className="table">
        <thead><tr><th>นักศึกษา</th><th>สถานะ</th><th className="hide-m">ส่งเมื่อ</th><th>คะแนน</th></tr></thead>
        <tbody>
          {subs.slice(0, 4).map((sub) => { const s = sById(sub.studentId); return (
            <tr key={sub.id}><td><div className="flex items-center gap-2"><Avatar name={s.name} size={26} />{s.name}</div></td>
              <td>{statusBadge(sub.status)}</td><td className="hide-m muted t-sm">{sub.at || "—"}</td>
              <td>{sub.score != null ? <span className="num fw-6">{sub.score}/{sub.total}</span> : <span className="muted t-sm">—</span>}</td></tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}

function LessonScores({ lesson, nav }) {
  const scores = DATA.testScores;
  const sById = (id) => DATA.students.find((s) => s.id === id);
  const [view, setView] = React.useState("test");
  return (
    <div>
      <div className="flex items-center justify-between mb-4 wrap gap-2">
        <div className="tabs pill">
          <button className={view === "test" ? "on" : ""} onClick={() => setView("test")}>คะแนน Pre/Post-test</button>
          <button className={view === "asg" ? "on" : ""} onClick={() => setView("asg")}>คะแนนใบงาน</button>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm"><Icon name="filter" size={15} />ทุก Section</button>
          <button className="btn btn-soft btn-sm" onClick={() => nav("/i/reports")}><Icon name="excel" size={15} />ส่งออก Excel</button>
        </div>
      </div>
      {view === "test" ? (
        <>
          <div className="grid grid-4 gap-3 mb-4">
            {[["ทำ Pre-test แล้ว", "5/6", "clipboard"], ["ทำ Post-test แล้ว", "4/6", "checkC"], ["คะแนนเฉลี่ย Pre", "6.0", "chart"], ["คะแนนเฉลี่ย Post", "8.5", "chart"]].map((s, i) => (
              <div key={i} className="card card-p"><div className="t-xs muted flex items-center gap-1"><Icon name={s[2]} size={14} />{s[0]}</div><div className="t-2xl fw-7 tnum mt-1">{s[1]}</div></div>
            ))}
          </div>
          <div className="card">
            <table className="table">
              <thead><tr><th>นักศึกษา</th><th className="hide-m">Section</th><th>Pre-test</th><th>Post-test</th><th>พัฒนาการ</th></tr></thead>
              <tbody>
                {scores.map((r) => {
                  const s = sById(r.studentId);
                  const diff = r.post != null && r.pre != null ? r.post - r.pre : null;
                  return (
                    <tr key={r.studentId}>
                      <td><div className="flex items-center gap-2"><Avatar name={s.name} size={28} /><div><div className="fw-5">{s.name}</div><div className="t-xs muted">{s.no}</div></div></div></td>
                      <td className="hide-m"><Badge tone="outline">{s.sec}</Badge></td>
                      <td>{r.pre != null ? <span className="num fw-6">{r.pre}/{r.total}</span> : <span className="muted t-sm">ยังไม่ทำ</span>}</td>
                      <td>{r.post != null ? <span className="num fw-6">{r.post}/{r.total}</span> : <span className="muted t-sm">ยังไม่ทำ</span>}</td>
                      <td>{diff != null ? <Badge tone={diff > 0 ? "success" : "muted"} dot>{diff > 0 ? "+" : ""}{diff}</Badge> : <span className="muted t-sm">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : <SubmissionMini nav={nav} />}
    </div>
  );
}

export default function InstructorLesson() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);
  const toast = (msg) => alert(msg); // fallback toast

  const lessonId = params?.id;
  const lesson = DATA.lessons.find((l) => l.id === lessonId) || DATA.lessons[0];
  const course = DATA.courses.find((c) => c.id === lesson.courseId);
  const [tab, setTab] = React.useState("video");

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: course.code, to: "/i/course/" + course.id }, { label: "บทที่ " + lesson.index }]} />
      <PageHead kicker={"แก้ไขบทเรียน · " + course.code} title={lesson.title}
        right={<div className="flex gap-2"><button className="btn btn-outline" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="eye" size={16} />ดูมุมมองนักศึกษา</button><button className="btn btn-primary" onClick={() => toast("บันทึกบทเรียนแล้ว")}><Icon name="check" size={16} />บันทึก</button></div>} />

      <div className="tabs mb-5">
        {[["video", "วิดีโอ", "video"], ["test", "ข้อสอบ Pre/Post", "clipboard"], ["assign", "ใบงาน + Rubric", "file"], ["scores", "คะแนนนักศึกษา", "chart"]].map(([k, t, ic]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
        ))}
      </div>

      {tab === "video" && <VideoManage lesson={lesson} toast={toast} />}
      {tab === "test" && <TestBuilder lesson={lesson} toast={toast} nav={nav} />}
      {tab === "assign" && <AssignmentBuilder lesson={lesson} toast={toast} nav={nav} />}
      {tab === "scores" && <LessonScores lesson={lesson} nav={nav} />}
    </div>
  );
}
