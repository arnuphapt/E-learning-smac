"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, statusBadge, Avatar } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";

function getFileName(filePath) {
  if (!filePath) return "";
  try {
    const parts = filePath.split("/");
    const name = parts[parts.length - 1];
    return decodeURIComponent(name.replace(/^\d+_/, ''));
  } catch (e) {
    return filePath;
  }
}

function getFileTypeAndSize(filePath) {
  if (!filePath) return "เอกสารแนบ";
  const ext = filePath.split('.').pop().toUpperCase();
  return ext ? `${ext} · เอกสารส่งงาน` : "เอกสารส่งงาน";
}

function GradedView({ a, rubric, instructorName }) {
  const totalScore = a.score || 0;
  const totalMax = a.points || 20;
  const ratio = totalMax > 0 ? totalScore / totalMax : 0;

  return (
    <div className="card" style={{ borderColor: "var(--success)", borderWidth: 1 }}>
      <div className="card-h flex items-center justify-between" style={{ background: "var(--success-soft)", borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
        <div className="title flex items-center gap-2 c-success"><Icon name="award" size={18} />ตรวจแล้ว — ผลคะแนนและข้อเสนอแนะ</div>
        <div className="t-2xl fw-7 c-success tnum">{totalScore}<span className="t-sm fw-5 muted">/{totalMax}</span></div>
      </div>
      <div className="card-p">
        <div className="t-sm fw-7 mb-2">คะแนนตามเกณฑ์ (Rubric)</div>
        <div className="flex col gap-2 mb-4">
          {rubric.criteria.map((c) => {
            const criteriaScore = Math.min(c.max, Math.round(c.max * ratio));
            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex-1 t-sm">{c.name}</div>
                <div style={{ width: 120 }}><Progress value={c.max > 0 ? (criteriaScore / c.max * 100) : 0} h={6} /></div>
                <div className="t-sm fw-6 tnum" style={{ width: 44, textAlign: "right" }}>{criteriaScore}/{c.max}</div>
              </div>
            );
          })}
        </div>
        <hr className="divider mb-4" />
        <div className="t-sm fw-7 mb-2 flex items-center gap-2"><Icon name="msg" size={16} className="c-primary" />ข้อเสนอแนะจากอาจารย์</div>
        <div className="lead pretty" style={{ padding: 14, borderRadius: 11, background: "var(--muted)" }}>
          ได้รับการตรวจประเมินเรียบร้อยแล้วค่ะ ผลคะแนนโดยรวมและเกณฑ์แต่ละข้อย่อยเป็นไปตามที่ปรากฏด้านบน หากมีข้อสงสัยเพิ่มเติมกรุณาสอบถามอาจารย์ผู้สอนโดยตรงค่ะ
        </div>
        <div className="flex items-center gap-2 mt-3 t-xs muted">
          <Avatar name={instructorName?.slice(0, 1) || "อ"} size={24} /> 
          ตรวจโดย {instructorName || "อาจารย์ผู้สอน"}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentDetail() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const nav = (path) => router.push(path);

  const asgId = params?.id;
  const studentId = session?.dbId;
  const role = session?.user?.role;

  const [a, setA] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [rubric, setRubric] = useState(null);
  const [submission, setSubmission] = useState(null);
  
  const [status, setStatus] = useState("not-submitted");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    async function load() {
      if (!asgId) return;
      const { data: aData } = await supabase.from("assignments").select("*").eq("id", asgId).single();
      if (!aData) { setLoading(false); return; }
      
      const { data: lData } = await supabase.from("lessons").select("*").eq("id", aData.lesson_id).single();
      
      const isStaff = role === "instructor" || role === "admin";
      if (lData && lData.status === "draft" && !isStaff) {
        setA(null);
        setLoading(false);
        return;
      }
      const { data: cData } = await supabase.from("courses").select("*").eq("id", aData.course_id).single();
      const { data: rData } = await supabase.from("rubrics").select("*").eq("id", aData.rubric_id).single();
      
      setA(aData);
      setLesson(lData);
      setCourse(cData);
      setRubric(rData);
      
      if (studentId) {
        const { data: subData } = await supabase.from("submissions").select("*").eq("student_id", studentId).eq("assignment_id", asgId).maybeSingle();
        if (subData) {
          setSubmission(subData);
          setStatus(subData.status);
          setFile(subData.file);
          setText(subData.text || "");
          setA(prev => ({
            ...prev,
            score: subData.score
          }));
        }
      }
      setLoading(false);
    }
    load();
  }, [asgId, studentId, role]);
  
  const mobile = false;
  const graded = status === "graded";
  const canSubmit = (a?.allow_file && file) || (a?.allow_text && text.trim());
  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setUploading(true);
    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadedFile.name,
          filetype: uploadedFile.type,
          folder: `submissions/${studentId || "guest"}/${asgId}`
        })
      });
      if (!presignRes.ok) throw new Error("Failed to get upload signature");

      const { uploadUrl, publicUrl, key } = await presignRes.json();

      if (uploadUrl) {
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": uploadedFile.type },
          body: uploadedFile
        });
        if (!uploadRes.ok) throw new Error("Failed to upload file to Cloudflare R2");
      }

      setFile(publicUrl);
      toast("อัปโหลดไฟล์สำเร็จ");
    } catch (err) {
      console.error(err);
      toast("เกิดข้อผิดพลาดในการอัปโหลด: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => { 
    if (!studentId) {
      toast("กรุณาเข้าสู่ระบบก่อนส่งงาน", "warning");
      return;
    }
    const subId = submission?.id || "sub_" + Date.now();
    const subObj = {
      id: subId,
      student_id: studentId,
      assignment_id: asgId,
      status: "submitted",
      submitted_at: new Date().toLocaleDateString("th-TH") + " " + new Date().toLocaleTimeString("th-TH").slice(0, 5) + " น.",
      file: file || null,
      text: text || null,
      score: null,
      total: a.points,
      late: false
    };

    const { error } = await supabase.from("submissions").upsert([subObj]);
    if (error) {
      toast("เกิดข้อผิดพลาดในการส่ง: " + error.message, "error");
    } else {
      setStatus("submitted");
      setSubmission(subObj);
      toast("ส่งใบงานเรียบร้อยแล้ว");
    }
  };

  const saveDraft = async () => {
    if (!studentId) {
      toast("กรุณาเข้าสู่ระบบก่อนบันทึกฉบับร่าง", "warning");
      return;
    }
    const subId = submission?.id || "sub_" + Date.now();
    const subObj = {
      id: subId,
      student_id: studentId,
      assignment_id: asgId,
      status: "not-submitted",
      submitted_at: null,
      file: file || null,
      text: text || null,
      score: null,
      total: a.points,
      late: false
    };

    const { error } = await supabase.from("submissions").upsert([subObj]);
    if (error) {
      toast("เกิดข้อผิดพลาดในการบันทึก: " + error.message, "error");
    } else {
      setStatus("not-submitted");
      setSubmission(subObj);
      toast("บันทึกฉบับร่างเรียบร้อยแล้ว");
    }
  };

  const cancelSubmit = async () => {
    if (!studentId) return;
    const { error } = await supabase.from("submissions").delete().eq("student_id", studentId).eq("assignment_id", asgId);
    if (error) {
      toast("เกิดข้อผิดพลาดในการยกเลิก: " + error.message, "error");
    } else {
      setStatus("not-submitted");
      setSubmission(null);
      setFile(null);
      setText("");
      toast("ยกเลิกการส่งใบงานแล้ว");
    }
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
      {a.attachments && a.attachments.length > 0 && (
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
      )}
      {/* rubric preview */}
      {rubric && rubric.criteria && rubric.criteria.length > 0 && (
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
      )}

      {/* submission area */}
      {graded ? <GradedView a={a} rubric={rubric} instructorName={course?.instructor} /> : (
        <div className="card">
          <div className="card-h"><div className="title flex items-center gap-2"><Icon name="upload" size={16} className="c-primary" />ส่งงานของคุณ</div>
            {status === "submitted" && <div className="desc">ส่งแล้ว · รอการตรวจจากอาจารย์</div>}</div>
          <div className="card-p">
            {status === "submitted" && (
              <div className="flex items-center gap-3 mb-4" style={{ padding: 13, borderRadius: 11, background: "var(--info-soft)" }}>
                <Icon name="clock" size={18} className="c-info" />
                <div className="flex-1 t-sm">
                  <b style={{ color: "var(--info)" }}>ส่งงานเรียบร้อยแล้ว</b>
                  <div className="muted">ส่งเมื่อ {submission?.submitted_at || "—"} — อาจารย์จะแจ้งผลเมื่อตรวจเสร็จ</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={cancelSubmit}>ยกเลิกการส่ง</button>
              </div>
            )}
            {a.allow_file && (status !== "submitted" || file) && (
              <div className="field">
                <label className="label">แนบไฟล์ {status === "submitted" && "(ส่งแล้ว)"}</label>
                {file ? (
                  <div className="flex items-center gap-3" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="file" size={17} /></div>
                    <div className="flex-1">
                      <div className="t-sm fw-6 truncate">{getFileName(file)}</div>
                      <div className="t-xs muted">{getFileTypeAndSize(file)}</div>
                    </div>
                    {status !== "submitted" && !uploading && (
                      <button className="btn btn-ghost btn-sm c-danger" onClick={() => setFile(null)}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      style={{ display: "none" }} 
                      disabled={uploading} 
                    />
                    <div 
                      className={`flex col items-center justify-center gap-2 pointer ${uploading ? "disabled" : ""}`} 
                      style={{ padding: "26px 18px", border: "1.5px dashed var(--border-strong)", borderRadius: 12, background: "#fbfcfd" }}
                      onClick={() => !uploading && fileInputRef.current?.click()}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
                        <Icon name="upload" size={20} />
                      </div>
                      <div className="t-sm fw-6">
                        {uploading ? "กำลังอัปโหลดไฟล์..." : "ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์"}
                      </div>
                      <div className="t-xs muted">รองรับ PDF, DOCX, รูปภาพ — ไม่เกิน 25 MB</div>
                    </div>
                  </div>
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
                <div className="t-xs muted flex items-center gap-1"><Icon name="alert" size={14} />ส่งได้ก่อน {a.due} {a.due_time}</div>
                <div className="flex gap-2">
                  <button className="btn btn-outline" onClick={saveDraft}>บันทึกฉบับร่าง</button>
                  <button className="btn btn-primary" disabled={!canSubmit || uploading} onClick={submit}><Icon name="send" size={15} />ส่งใบงาน</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  let timeRemainingStr = "ไม่ระบุ";
  let colorStyle = "var(--muted-fg)";
  
  if (a?.due) {
    if (status === "submitted" || status === "graded") {
      timeRemainingStr = "ส่งงานเรียบร้อยแล้ว";
      colorStyle = "var(--success)";
    } else {
      const dueDateTimeString = `${a.due}T${a.due_time || "23:59"}:00`;
      const dueDate = new Date(dueDateTimeString);
      const now = new Date();
      const diffMs = dueDate.getTime() - now.getTime();
      
      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffDays > 0) {
          timeRemainingStr = `${diffDays} วัน ${diffHours} ชั่วโมง`;
          colorStyle = "var(--success)";
        } else if (diffHours > 0) {
          timeRemainingStr = `${diffHours} ชั่วโมง ${diffMins} นาที`;
          colorStyle = "var(--warning)";
        } else {
          timeRemainingStr = `${diffMins} นาที`;
          colorStyle = "var(--danger)";
        }
      } else {
        timeRemainingStr = "เกินกำหนดส่งแล้ว";
        colorStyle = "var(--danger)";
      }
    }
  }

  const Side = (
    <div style={{ width: mobile ? "100%" : 300, flex: mobile ? "1" : "0 0 300px" }}>
      <div className="card card-p">
        <div className="flex items-center justify-between mb-3"><div className="t-sm fw-7">สถานะการส่ง</div>{statusBadge(status)}</div>
        <div className="flex col gap-3 t-sm">
          <div className="flex items-center justify-between"><span className="muted flex items-center gap-2"><Icon name="cal" size={15} />กำหนดส่ง</span><span className="fw-6">{a.due_short || a.due}</span></div>
          <div className="flex items-center justify-between"><span className="muted flex items-center gap-2"><Icon name="star" size={15} />คะแนนเต็ม</span><span className="fw-6">{a.points}</span></div>
          <div className="flex items-center justify-between"><span className="muted flex items-center gap-2"><Icon name="clock" size={15} />เหลือเวลา</span><span className="fw-6" style={{ color: colorStyle }}>{timeRemainingStr}</span></div>
        </div>
        {graded && <><hr className="divider mt-4 mb-3" /><div className="center"><div className="t-xs muted mb-1">คะแนนที่ได้</div><div className="t-3xl fw-7 c-success tnum">{a.score}<span className="muted t-md fw-5">/{a.points}</span></div></div></>}
      </div>
    </div>
  );

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: course?.code || "รายวิชา", to: "/s/course/" + course?.id }, { label: "บทที่ " + (lesson?.index || ""), to: "/s/lesson/" + lesson?.id }, { label: "ใบงาน" }]} />
      <PageHead kicker={"ใบงาน · " + (course?.code || "")} title={a.title} />
      <div className="flex gap-5 items-start" style={{ flexDirection: mobile ? "column" : "row" }}>
        {Main}{Side}
      </div>
    </div>
  );
}
