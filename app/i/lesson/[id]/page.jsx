"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, Avatar, Dialog, Ph, statusBadge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";

function ToggleRow({ label, on, onChange }) {
  const [v, setV] = React.useState(on);
  React.useEffect(() => { setV(on); }, [on]);
  const handleToggle = () => {
    const next = !v;
    setV(next);
    if (onChange) onChange(next);
  };
  return (
    <div className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="t-sm pretty" style={{ paddingRight: 12 }}>{label}</span>
      <button onClick={handleToggle} style={{ width: 40, height: 23, borderRadius: 99, border: 0, cursor: "pointer", padding: 2, background: v ? "var(--primary)" : "#cbd5e1", transition: ".15s", flex: "0 0 40px" }}>
        <span style={{ display: "block", width: 19, height: 19, borderRadius: 99, background: "#fff", transform: v ? "translateX(17px)" : "translateX(0)", transition: ".15s" }} />
      </button>
    </div>
  );
}

function Chk({ label, on, onChange }) {
  const [v, setV] = React.useState(on);
  React.useEffect(() => { setV(on); }, [on]);
  const handleToggle = () => {
    const next = !v;
    setV(next);
    if (onChange) onChange(next);
  };
  return (
    <button onClick={handleToggle} className="flex items-center gap-2 t-sm" style={{ padding: "8px 12px", borderRadius: 9, cursor: "pointer", border: "1px solid " + (v ? "var(--primary)" : "var(--border-strong)"), background: v ? "var(--primary-soft)" : "#fff", fontWeight: v ? 600 : 400, color: v ? "var(--primary-soft-fg)" : "var(--fg)" }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid " + (v ? "var(--primary)" : "#cbd5e1"), background: v ? "var(--primary)" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>{v && <Icon name="check" size={13} />}</span>
      {label}
    </button>
  );
}

function VideoManage({ lesson, onSave }) {
  const [title, setTitle] = useState(lesson.title || "");
  const [desc, setDesc] = useState(lesson.description || "");
  const [duration, setDuration] = useState(lesson.duration || "");
  const [status, setStatus] = useState(lesson.status || "draft");
  const [preReq, setPreReq] = useState(lesson.pretest?.required || false);
  const [postReq, setPostReq] = useState(lesson.posttest?.required || false);

  const handleSave = () => {
    onSave({
      title,
      description: desc,
      duration,
      status,
      pretest: { ...lesson.pretest, required: preReq },
      posttest: { ...lesson.posttest, required: postReq }
    });
  };

  const videoFileName = lesson.video ? `${lesson.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_lecture.mp4` : "ยังไม่ได้อัปโหลดวิดีโอ";
  const videoDetails = lesson.video ? `${lesson.duration || "30"} นาที · อัปโหลดแล้ว` : "ไม่มีวิดีโอการเรียนการสอน";

  return (
    <div className="flex gap-5 items-start wrap">
      <div className="flex-1" style={{ minWidth: 280 }}>
        <div className="card mb-4">
          <div className="card-h"><div className="title">คลิปการสอน</div><div className="desc">อัปโหลดหรือลิงก์วิดีโอบทเรียน</div></div>
          <div className="card-p">
            <Ph label="วิดีโอบทเรียน · 16:9" h={200} style={{ marginBottom: 16 }} />
            <div className="flex items-center gap-3" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 11 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="video" size={17} /></div>
              <div className="flex-1"><div className="t-sm fw-6">{videoFileName}</div><div className="t-xs muted">{videoDetails}</div></div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="title">รายละเอียดบทเรียน</div></div>
          <div className="card-p">
            <div className="field"><label className="label">ชื่อบทเรียน</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="field"><label className="label">คำอธิบาย</label><textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div className="grid grid-2 gap-3">
              <div className="field" style={{ margin: 0 }}><label className="label">ความยาว (เช่น 42 นาที)</label><input className="input" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
              <div className="field" style={{ margin: 0 }}><label className="label">สถานะการเผยแพร่</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">เผยแพร่แล้ว</option>
                  <option value="draft">ฉบับร่าง</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ width: 300, flex: "0 0 300px" }}>
        <div className="card card-p">
          <div className="t-sm fw-7 mb-3">การตั้งค่าการเข้าถึง</div>
          <ToggleRow label="ต้องทำ Pre-test ก่อนดูวิดีโอ" on={preReq} onChange={setPreReq} />
          <ToggleRow label="ต้องทำ Post-test หลังเรียน" on={postReq} onChange={setPostReq} />
          <ToggleRow label="ดูวิดีโอครบ 80% ก่อนทำ Post-test" on={true} />
          <ToggleRow label="อนุญาตให้ดาวน์โหลดเอกสาร" on={true} />
          <button className="btn btn-primary btn-block mt-4" onClick={handleSave}><Icon name="check" size={15} />บันทึกรายละเอียด</button>
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ q, onClose, onSave }) {
  const [text, setText] = React.useState(q.text);
  const [choices, setChoices] = React.useState(q.choices || [{ id: "a", text: "" }, { id: "b", text: "" }]);
  const [answer, setAnswer] = React.useState(q.answer || "a");
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

function TestBuilder({ lesson, toast, questions, onLoad }) {
  const [which, setWhich] = React.useState("pre");
  const [qs, setQs] = React.useState(questions || []);
  const [editing, setEditing] = React.useState(null);

  React.useEffect(() => {
    setQs(questions || []);
  }, [questions]);

  const handleSaveQuestion = async (nq) => {
    if (nq.id && !String(nq.id).startsWith("temp_")) {
      const { error } = await supabase.from("questions").update({
        no: nq.no,
        type: nq.type || "single",
        text: nq.text,
        choices: nq.choices,
        answer: nq.answer
      }).eq("id", nq.id);
      if (error) toast("เกิดข้อผิดพลาด: " + error.message);
      else {
        toast("บันทึกข้อสอบแล้ว");
        onLoad();
      }
    } else {
      const newId = "q_" + Date.now();
      const { error } = await supabase.from("questions").insert([{
        id: newId,
        no: qs.length + 1,
        type: nq.type || "single",
        text: nq.text,
        choices: nq.choices,
        answer: nq.answer
      }]);
      if (error) toast("เกิดข้อผิดพลาด: " + error.message);
      else {
        toast("เพิ่มข้อสอบใหม่เรียบร้อยแล้ว");
        onLoad();
      }
    }
    setEditing(null);
  };

  const handleDeleteQuestion = async (id) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast("ลบข้อสอบเรียบร้อยแล้ว");
      onLoad();
    }
  };

  return (
    <div className="flex gap-5 items-start wrap">
      <div className="flex-1" style={{ minWidth: 300 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="tabs pill">
            <button className={which === "pre" ? "on" : ""} onClick={() => setWhich("pre")}>Pre-test</button>
            <button className={which === "post" ? "on" : ""} onClick={() => setWhich("post")}>Post-test</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ no: qs.length + 1, type: "single", text: "", choices: [{ id: "a", text: "" }, { id: "b", text: "" }], answer: "a", id: "temp_" + Date.now() })}><Icon name="plus" size={15} />เพิ่มข้อสอบ</button>
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
                    {q.choices && q.choices.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 t-sm" style={{ color: c.id === q.answer ? "var(--success)" : "var(--muted-fg)", fontWeight: c.id === q.answer ? 600 : 400 }}>
                        <Icon name={c.id === q.answer ? "checkC" : "circle"} size={14} />{c.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex col gap-1">
                  <button className="iconbtn ghost" onClick={() => setEditing(q)}><Icon name="pencil" size={15} /></button>
                  <button className="iconbtn ghost c-danger" onClick={() => handleDeleteQuestion(q.id)}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            </div>
          ))}
          <button className="card card-p flex items-center justify-center gap-2 pointer muted" style={{ borderStyle: "dashed", background: "#fbfcfd" }} onClick={() => setEditing({ no: qs.length + 1, type: "single", text: "", choices: [{ id: "a", text: "" }, { id: "b", text: "" }], answer: "a", id: "temp_" + Date.now() })}>
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
          <button className="btn btn-primary btn-block mt-3" onClick={() => toast("บันทึกเกณฑ์สำเร็จ")}><Icon name="check" size={15} />บันทึกเกณฑ์</button>
        </div>
      </div>
      {editing && <QuestionEditor q={editing} onClose={() => setEditing(null)} onSave={handleSaveQuestion} />}
    </div>
  );
}

function AssignmentBuilder({ lesson, toast, assignments, rubrics, onLoad }) {
  const a = assignments[0] || { title: "", instructions: "", due: "", points: 10, allow_file: true, allow_text: true };
  const rubric = rubrics[0] || { criteria: [] };

  const [title, setTitle] = useState(a.title || "");
  const [instructions, setInstructions] = useState(a.instructions || "");
  const [due, setDue] = useState(a.due || "");
  const [allowFile, setAllowFile] = useState(a.allow_file ?? true);
  const [allowText, setAllowText] = useState(a.allow_text ?? true);

  const [criteria, setCriteria] = useState(rubric.criteria || []);
  const total = criteria.reduce((s, c) => s + c.max, 0);

  useEffect(() => {
    setTitle(a.title || "");
    setInstructions(a.instructions || "");
    setDue(a.due || "");
    setAllowFile(a.allow_file ?? true);
    setAllowText(a.allow_text ?? true);
  }, [assignments]);

  useEffect(() => {
    setCriteria(rubric.criteria || []);
  }, [rubrics]);

  const setMax = (id, v) => setCriteria((cs) => cs.map((c) => c.id === id ? { ...c, max: Math.max(0, +v || 0) } : c));
  const setCritName = (id, v) => setCriteria((cs) => cs.map((c) => c.id === id ? { ...c, name: v } : c));
  const setCritDesc = (id, v) => setCriteria((cs) => cs.map((c) => c.id === id ? { ...c, desc: v } : c));
  const add = () => setCriteria([...criteria, { id: "rc" + Date.now(), name: "", desc: "", max: 5 }]);

  const handleSave = async () => {
    const asgObj = {
      title,
      instructions,
      due,
      points: total,
      allow_file: allowFile,
      allow_text: allowText,
      lesson_id: lesson.id,
      course_id: lesson.course_id
    };

    let error = null;
    let assignmentId = a.id;

    if (a.id) {
      const { error: err } = await supabase.from("assignments").update(asgObj).eq("id", a.id);
      error = err;
    } else {
      assignmentId = "a_" + Date.now();
      const { error: err } = await supabase.from("assignments").insert([{ id: assignmentId, ...asgObj }]);
      error = err;
    }

    if (!error) {
      if (rubric.id) {
        const { error: rErr } = await supabase.from("rubrics").update({ criteria }).eq("id", rubric.id);
        error = rErr;
      } else {
        const rubricId = "r_" + Date.now();
        const { error: rErr } = await supabase.from("rubrics").insert([{ id: rubricId, title: title + " Rubric", criteria }]);
        error = rErr;
        if (!rErr && !a.id) {
          // Bind rubric_id to assignment if newly created
          await supabase.from("assignments").update({ rubric_id: rubricId }).eq("id", assignmentId);
        }
      }
    }

    if (error) {
      toast("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
    } else {
      toast("บันทึกใบงานและ Rubric เรียบร้อยแล้ว");
      onLoad();
    }
  };

  return (
    <div className="flex gap-5 items-start wrap">
      <div className="flex-1" style={{ minWidth: 300 }}>
        <div className="card mb-4">
          <div className="card-h"><div className="title">รายละเอียดใบงาน</div></div>
          <div className="card-p">
            <div className="field"><label className="label">ชื่อใบงาน</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="field"><label className="label">คำชี้แจง</label><textarea className="input" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
            <div className="grid grid-3 gap-3">
              <div className="field" style={{ margin: 0 }}><label className="label">กำหนดส่ง</label><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
              <div className="field" style={{ margin: 0 }}><label className="label">เวลา</label><input className="input" defaultValue="23:59" /></div>
              <div className="field" style={{ margin: 0 }}><label className="label">คะแนนเต็ม</label><input className="input" value={total} readOnly /></div>
            </div>
            <label className="label mt-2">รูปแบบการส่งงาน</label>
            <div className="flex gap-2 wrap">
              <Chk label="แนบไฟล์ (PDF/DOCX/รูปภาพ)" on={allowFile} onChange={setAllowFile} />
              <Chk label="พิมพ์คำตอบเป็นข้อความ" on={allowText} onChange={setAllowText} />
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
                    <input className="input mb-2" value={c.name} onChange={(e) => setCritName(c.id, e.target.value)} placeholder={"เกณฑ์ที่ " + (i + 1)} style={{ fontWeight: 600 }} />
                    <input className="input" value={c.desc || ""} onChange={(e) => setCritDesc(c.id, e.target.value)} placeholder="คำอธิบายเกณฑ์ (ระดับคะแนนเต็ม)" style={{ height: 34, fontSize: 13 }} />
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
          <button className="btn btn-primary btn-block mt-4" onClick={handleSave}><Icon name="check" size={15} />บันทึกใบงาน</button>
        </div>
      </div>
    </div>
  );
}

function SubmissionMini({ submissions, students }) {
  const sById = (id) => students.find((s) => s.id === id) || { name: "Unknown", student_no: "-" };
  return (
    <div className="card">
      <div className="card-h"><div className="title">รายการส่งใบงานที่ส่งเข้ามา</div></div>
      <Table
        className="table"
        headers={[
          "นักศึกษา",
          "สถานะ",
          <span className="hide-m" key="sentAt">ส่งเมื่อ</span>,
          "คะแนน"
        ]}
        data={submissions}
        colSpan={4}
        renderRow={(sub) => {
          const s = sById(sub.student_id);
          return (
            <tr key={sub.id}>
              <td><div className="flex items-center gap-2"><Avatar name={s.name} size={26} />{s.name}</div></td>
              <td>{statusBadge(sub.status)}</td>
              <td className="hide-m muted t-sm">{sub.submitted_at || "—"}</td>
              <td>{sub.score != null ? <span className="num fw-6">{sub.score}/{sub.total}</span> : <span className="muted t-sm">—</span>}</td>
            </tr>
          );
        }}
      />
    </div>
  );
}

function LessonScores({ enrolledStudents, testScores, submissions }) {
  const [view, setView] = React.useState("test");

  const enrolledStudentIds = enrolledStudents.map(s => s.id);
  const enrolledScores = testScores.filter(ts => enrolledStudentIds.includes(ts.student_id));

  const preTaken = enrolledScores.filter(ts => ts.pre !== null && ts.pre !== undefined).length;
  const postTaken = enrolledScores.filter(ts => ts.post !== null && ts.post !== undefined).length;

  const preVals = enrolledScores.map(ts => ts.pre).filter(v => v !== null && v !== undefined);
  const avgPre = preVals.length > 0 ? (preVals.reduce((a, b) => a + b, 0) / preVals.length).toFixed(1) : "—";

  const postVals = enrolledScores.map(ts => ts.post).filter(v => v !== null && v !== undefined);
  const avgPost = postVals.length > 0 ? (postVals.reduce((a, b) => a + b, 0) / postVals.length).toFixed(1) : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 wrap gap-2">
        <div className="tabs pill">
          <button className={view === "test" ? "on" : ""} onClick={() => setView("test")}>คะแนน Pre/Post-test</button>
          <button className={view === "asg" ? "on" : ""} onClick={() => setView("asg")}>คะแนนใบงาน</button>
        </div>
      </div>
      {view === "test" ? (
        <>
          <div className="grid grid-4 gap-3 mb-4">
            {[
              ["ทำ Pre-test แล้ว", `${preTaken}/${enrolledStudents.length}`, "clipboard"], 
              ["ทำ Post-test แล้ว", `${postTaken}/${enrolledStudents.length}`, "checkC"], 
              ["คะแนนเฉลี่ย Pre", avgPre, "chart"], 
              ["คะแนนเฉลี่ย Post", avgPost, "chart"]
            ].map((s, i) => (
              <div key={i} className="card card-p">
                <div className="t-xs muted flex items-center gap-1"><Icon name={s[2]} size={14} />{s[0]}</div>
                <div className="t-2xl fw-7 tnum mt-1">{s[1]}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <Table
              className="table"
              headers={[
                "นักศึกษา",
                <span className="hide-m" key="sec">Section</span>,
                "Pre-test",
                "Post-test",
                "พัฒนาการ"
              ]}
              data={enrolledScores}
              colSpan={5}
              renderRow={(r) => {
                const s = enrolledStudents.find(student => student.id === r.student_id) || { name: "Unknown", student_no: "-", section: "-" };
                const diff = r.post != null && r.pre != null ? r.post - r.pre : null;
                return (
                  <tr key={r.student_id}>
                    <td><div className="flex items-center gap-2"><Avatar name={s.name} size={28} /><div><div className="fw-5">{s.name}</div><div className="t-xs muted">{s.student_no}</div></div></div></td>
                    <td className="hide-m"><Badge tone="outline">{s.section || "-"}</Badge></td>
                    <td>{r.pre != null ? <span className="num fw-6">{r.pre}/{r.total}</span> : <span className="muted t-sm">ยังไม่ทำ</span>}</td>
                    <td>{r.post != null ? <span className="num fw-6">{r.post}/{r.total}</span> : <span className="muted t-sm">ยังไม่ทำ</span>}</td>
                    <td>{diff != null ? <Badge tone={diff > 0 ? "success" : "muted"} dot>{diff > 0 ? "+" : ""}{diff}</Badge> : <span className="muted t-sm">—</span>}</td>
                  </tr>
                );
              }}
            />
          </div>
        </>
      ) : (
        <SubmissionMini submissions={submissions} students={enrolledStudents} />
      )}
    </div>
  );
}

export default function InstructorLesson() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const lessonId = params?.id;
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [tab, setTab] = useState("video");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ questions: [], assignments: [], rubrics: [], submissions: [], testScores: [], students: [] });

  const loadData = async () => {
    if (!lessonId) return;
    if (lessonId === "new") {
      setLesson({ title: "บทเรียนใหม่", index: 1, pretest: {}, posttest: {}, duration: "", desc: "" });
      setCourse({ code: "วิชาใหม่", title: "ไม่มีวิชา" });
      setLoading(false);
      return;
    }
    const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
    if (!lData) { setLoading(false); return; }
    
    const { data: cData } = await supabase.from("courses").select("*").eq("id", lData.course_id).single();
    
    const [qRes, aRes, rRes, subRes, tsRes, stRes] = await Promise.all([
      supabase.from("questions").select("*").order("no", { ascending: true }),
      supabase.from("assignments").select("*").eq("lesson_id", lessonId),
      supabase.from("rubrics").select("*"),
      supabase.from("submissions").select("*").eq("assignment_id", aRes?.data?.[0]?.id || "_dummy_"), // filtered by assignment
      supabase.from("test_scores").select("*"),
      supabase.from("users").select("*").eq("role", "student")
    ]);
    
    // In case query for submissions needs to run with resolved assignment id
    let finalSubmissions = subRes.data || [];
    const assignmentObj = aRes.data?.[0];
    if (assignmentObj) {
      const { data: subData } = await supabase.from("submissions").select("*").eq("assignment_id", assignmentObj.id);
      if (subData) finalSubmissions = subData;
    }
    
    setLesson(lData);
    setCourse(cData || { code: "", title: "" });
    setData({
      questions: qRes.data || [],
      assignments: aRes.data || [],
      rubrics: rRes.data || [],
      submissions: finalSubmissions,
      testScores: tsRes.data || [],
      students: stRes.data || []
    });
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [lessonId]);

  const handleSaveLessonDetails = async (updatedFields) => {
    const { error } = await supabase.from("lessons").update(updatedFields).eq("id", lessonId);
    if (error) {
      toast("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
    } else {
      setLesson(prev => ({ ...prev, ...updatedFields }));
      toast("บันทึกรายละเอียดบทเรียนเรียบร้อยแล้ว");
    }
  };

  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!lesson) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบบทเรียน</div>
            <div className="t-sm muted">ไม่พบบทเรียนตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของบทเรียนนี้</div>
          </div>
        </div>
      </div>
    );
  }

  // Filter students based on course restrictions
  const courseSection = course?.section;
  const allowedYears = course?.access?.allowedYears || [];
  const allowedEmails = course?.access?.allowedEmails || [];
  const enrolledStudents = data.students.filter(s => {
    if (courseSection && courseSection !== "ไม่ระบุ Section" && s.section !== courseSection) {
      return false;
    }
    if (allowedYears.length > 0) {
      const studentYear = s.student_no ? s.student_no.slice(0, 2) : "";
      if (!allowedYears.includes(studentYear) && !allowedEmails.includes(s.email)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: course.code, to: "/i/course/" + course.id }, { label: "บทที่ " + lesson.index }]} />
      <PageHead kicker={"แก้ไขบทเรียน · " + course.code} title={lesson.title}
        right={<div className="flex gap-2"><button className="btn btn-outline" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="eye" size={16} />ดูมุมมองนักศึกษา</button></div>} />

      <div className="tabs mb-5">
        {[["video", "วิดีโอ", "video"], ["test", "ข้อสอบ Pre/Post", "clipboard"], ["assign", "ใบงาน + Rubric", "file"], ["scores", "คะแนนนักศึกษา", "chart"]].map(([k, t, ic]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
        ))}
      </div>

      {tab === "video" && <VideoManage lesson={lesson} onSave={handleSaveLessonDetails} />}
      {tab === "test" && <TestBuilder lesson={lesson} toast={toast} questions={data.questions} onLoad={loadData} />}
      {tab === "assign" && <AssignmentBuilder lesson={lesson} toast={toast} assignments={data.assignments} rubrics={data.rubrics} onLoad={loadData} />}
      {tab === "scores" && <LessonScores enrolledStudents={enrolledStudents} testScores={data.testScores} submissions={data.submissions} />}
    </div>
  );
}
