"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, statusBadge, Avatar } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

function GradedView({ a, rubric }) {
  const scores = [5, 4, 5, 4];
  return (
    <div className="card" style={{ borderColor: "var(--success)", borderWidth: 1 }}>
      <div className="card-h flex items-center justify-between" style={{ background: "var(--success-soft)", borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
        <div className="title flex items-center gap-2 c-success"><Icon name="award" size={18} />ตรวจแล้ว — ผลคะแนนและข้อเสนอแนะ</div>
        <div className="t-2xl fw-7 c-success tnum">{a.score}<span className="t-sm fw-5 muted">/{a.points}</span></div>
      </div>
      <div className="card-p">
        <div className="t-sm fw-7 mb-2">คะแนนตามเกณฑ์ (Rubric)</div>
        <div className="flex col gap-2 mb-4">
          {rubric.criteria.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="flex-1 t-sm">{c.name}</div>
              <div style={{ width: 120 }}><Progress value={scores[i] / c.max * 100} h={6} /></div>
              <div className="t-sm fw-6 tnum" style={{ width: 44, textAlign: "right" }}>{scores[i]}/{c.max}</div>
            </div>
          ))}
        </div>
        <hr className="divider mb-4" />
        <div className="t-sm fw-7 mb-2 flex items-center gap-2"><Icon name="msg" size={16} className="c-primary" />ข้อเสนอแนะจากอาจารย์</div>
        <div className="lead pretty" style={{ padding: 14, borderRadius: 11, background: "var(--muted)" }}>
          งานเขียนกระบวนการพยาบาลครบถ้วนและจัดลำดับความสำคัญได้ดีมากค่ะ ส่วนที่ควรพัฒนาคือการอ้างอิงหลักฐานเชิงประจักษ์ ควรเลือกแหล่งที่ตีพิมพ์ภายใน 5 ปี และเชื่อมโยงกับกิจกรรมการพยาบาลให้ชัดเจนขึ้น โดยรวมทำได้ดีมากค่ะ
        </div>
        <div className="flex items-center gap-2 mt-3 t-xs muted"><Avatar name="ส" size={24} /> ตรวจโดย อ. ดร. สุภาวดี ทองคำ · 20 มิ.ย. 2568</div>
      </div>
    </div>
  );
}

export default function AssignmentDetail() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const asgId = params?.id;
  const [a, setA] = React.useState(null);
  const [lesson, setLesson] = React.useState(null);
  const [course, setCourse] = React.useState(null);
  const [rubric, setRubric] = React.useState(null);
  
  const [status, setStatus] = React.useState("not-submitted");
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      if (!asgId) return;
      const { data: aData } = await supabase.from("assignments").select("*").eq("id", asgId).single();
      if (!aData) { setLoading(false); return; }
      
      const { data: lData } = await supabase.from("lessons").select("*").eq("id", aData.lesson_id).single();
      const { data: cData } = await supabase.from("courses").select("*").eq("id", aData.course_id).single();
      const { data: rData } = await supabase.from("rubrics").select("*").eq("id", aData.rubric_id).single();
      
      setA(aData);
      setLesson(lData);
      setCourse(cData);
      setRubric(rData);
      
      if (lData?.assignment?.status) {
        setStatus(lData.assignment.status);
        if (lData.assignment.status !== "not-submitted") {
           setFile("case_HF_ของฉัน.pdf");
        }
      }
      setLoading(false);
    }
    load();
  }, [asgId]);
  
  const mobile = false;
  const graded = status === "graded";

  const submit = () => { 
    setStatus("submitted"); 
    alert("ส่งใบงานเรียบร้อยแล้ว"); 
  };

  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!a) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบใบงาน</div>
            <div className="t-sm muted">ไม่พบใบงานตามรหัสที่ระบุ หรือข้อมูลใบงานนี้ไม่มีอยู่ในระบบ</div>
          </div>
        </div>
      </div>
    );
  }

  const Main = (
    <div className="flex-1" style={{ minWidth: 0 }}>
      {/* instructions */}
      <div className="card mb-4">
        <div className="card-h"><div className="title flex items-center gap-2"><Icon name="listChk" size={17} className="c-primary" />คำชี้แจง</div></div>
        <div className="card-p"><p className="lead pretty" style={{ margin: 0 }}>{a.instructions}</p></div>
      </div>
      {/* attachments */}
      <div className="card mb-4">
        <div className="card-h"><div className="title flex items-center gap-2"><Icon name="clip" size={16} className="c-primary" />ไฟล์แนบจากอาจารย์</div></div>
        <div style={{ padding: 8 }}>
          {a.attachments.map((f, i) => (
            <div key={i} className="flex items-center gap-3" style={{ padding: "10px 12px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--info-soft)", color: "var(--info)", display: "grid", placeItems: "center" }}><Icon name="file" size={17} /></div>
              <div className="flex-1"><div className="t-sm fw-6">{f.name}</div><div className="t-xs muted">{f.size}</div></div>
              <button className="btn btn-ghost btn-sm"><Icon name="download" size={15} /></button>
            </div>
          ))}
        </div>
      </div>
      {/* rubric preview */}
      <div className="card mb-4">
        <div className="card-h"><div className="title flex items-center gap-2"><Icon name="target" size={16} className="c-primary" />เกณฑ์การให้คะแนน (Rubric)</div><div className="desc">{rubric.title} · เต็ม {a.points} คะแนน</div></div>
        <div style={{ padding: 8 }}>
          {rubric.criteria.map((c) => (
            <div key={c.id} className="flex items-center gap-3" style={{ padding: "10px 12px" }}>
              <div className="flex-1"><div className="t-sm fw-6">{c.name}</div><div className="t-xs muted">{c.desc}</div></div>
              <Badge tone="muted">{c.max} คะแนน</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* submission area */}
      {graded ? <GradedView a={a} rubric={rubric} /> : (
        <div className="card">
          <div className="card-h"><div className="title flex items-center gap-2"><Icon name="upload" size={16} className="c-primary" />ส่งงานของคุณ</div>
            {status === "submitted" && <div className="desc">ส่งแล้ว · รอการตรวจจากอาจารย์</div>}</div>
          <div className="card-p">
            {status === "submitted" && (
              <div className="flex items-center gap-3 mb-4" style={{ padding: 13, borderRadius: 11, background: "var(--info-soft)" }}>
                <Icon name="clock" size={18} className="c-info" />
                <div className="flex-1 t-sm"><b style={{ color: "var(--info)" }}>ส่งงานเรียบร้อยแล้ว</b><div className="muted">ส่งเมื่อ 19 มิ.ย. 22:40 น. — อาจารย์จะแจ้งผลเมื่อตรวจเสร็จ</div></div>
                <button className="btn btn-outline btn-sm" onClick={() => setStatus("not-submitted")}>ยกเลิกการส่ง</button>
              </div>
            )}
            {a.allow_file && (
              <div className="field">
                <label className="label">แนบไฟล์ {status === "submitted" && "(ส่งแล้ว)"}</label>
                {file ? (
                  <div className="flex items-center gap-3" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="file" size={17} /></div>
                    <div className="flex-1"><div className="t-sm fw-6">{file}</div><div className="t-xs muted">PDF · 1.8 MB</div></div>
                    {status !== "submitted" && <button className="btn btn-ghost btn-sm c-danger" onClick={() => setFile(null)}><Icon name="trash" size={15} /></button>}
                  </div>
                ) : (
                  <label className="flex col items-center justify-center gap-2 pointer" style={{ padding: "26px 18px", border: "1.5px dashed var(--border-strong)", borderRadius: 12, background: "#fbfcfd" }}
                    onClick={() => setFile("case_HF_ของฉัน.pdf")}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="upload" size={20} /></div>
                    <div className="t-sm fw-6">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</div>
                    <div className="t-xs muted">รองรับ PDF, DOCX, รูปภาพ — ไม่เกิน 25 MB</div>
                  </label>
                )}
              </div>
            )}
            {a.allow_text && (
              <div className="field">
                <label className="label">คำตอบ / หมายเหตุถึงอาจารย์ <span className="muted fw-4">(ถ้ามี)</span></label>
                <textarea className="input" rows={4} placeholder="พิมพ์คำตอบหรือคำอธิบายเพิ่มเติม…" value={text} onChange={(e) => setText(e.target.value)} disabled={status === "submitted"} />
              </div>
            )}
            {status !== "submitted" && (
              <div className="flex items-center justify-between gap-2 wrap">
                <div className="t-xs muted flex items-center gap-1"><Icon name="alert" size={14} />ส่งได้ก่อน {a.due}</div>
                <div className="flex gap-2">
                  <button className="btn btn-outline">บันทึกฉบับร่าง</button>
                  <button className="btn btn-primary" disabled={!file} onClick={submit}><Icon name="send" size={15} />ส่งใบงาน</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const Side = (
    <div style={{ width: mobile ? "100%" : 300, flex: mobile ? "1" : "0 0 300px" }}>
      <div className="card card-p">
        <div className="flex items-center justify-between mb-3"><div className="t-sm fw-7">สถานะการส่ง</div>{statusBadge(status)}</div>
        <div className="flex col gap-3 t-sm">
          <div className="flex items-center justify-between"><span className="muted flex items-center gap-2"><Icon name="cal" size={15} />กำหนดส่ง</span><span className="fw-6">{a.due_short}</span></div>
          <div className="flex items-center justify-between"><span className="muted flex items-center gap-2"><Icon name="star" size={15} />คะแนนเต็ม</span><span className="fw-6">{a.points}</span></div>
          <div className="flex items-center justify-between"><span className="muted flex items-center gap-2"><Icon name="clock" size={15} />เหลือเวลา</span><span className="fw-6 c-warning">2 วัน</span></div>
        </div>
        {graded && <><hr className="divider mt-4 mb-3" /><div className="center"><div className="t-xs muted mb-1">คะแนนที่ได้</div><div className="t-3xl fw-7 c-success tnum">{a.score}<span className="muted t-md fw-5">/{a.points}</span></div></div></>}
      </div>
    </div>
  );

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: course.code, to: "/s/course/" + course.id }, { label: "บทที่ " + lesson.index, to: "/s/lesson/" + lesson.id }, { label: "ใบงาน" }]} />
      <PageHead kicker={"ใบงาน · " + course.code} title={a.title} />
      <div className="flex gap-5 items-start" style={{ flexDirection: mobile ? "column" : "row" }}>
        {Main}{Side}
      </div>
    </div>
  );
}
