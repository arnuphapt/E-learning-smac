"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Avatar, statusBadge, Badge, Ph, Progress } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";

function distributeScore(totalScore, criteria, totalPoints) {
  if (totalScore == null) {
    return Object.fromEntries(criteria.map(c => [c.id, 0]));
  }
  
  const rawScores = criteria.map(c => {
    return {
      id: c.id,
      max: c.max,
      val: (totalScore / totalPoints) * c.max
    };
  });
  
  const scores = {};
  let currentSum = 0;
  
  rawScores.forEach(c => {
    const floored = Math.floor(c.val);
    scores[c.id] = floored;
    currentSum += floored;
  });
  
  let remainder = totalScore - currentSum;
  if (remainder > 0) {
    const sortedByFraction = rawScores
      .map(c => ({
        id: c.id,
        fraction: c.val - Math.floor(c.val),
        max: c.max
      }))
      .sort((a, b) => b.fraction - a.fraction);
      
    for (let i = 0; i < remainder; i++) {
      const item = sortedByFraction[i % sortedByFraction.length];
      if (scores[item.id] < item.max) {
        scores[item.id] += 1;
      }
    }
  }
  
  return scores;
}

export default function Grader() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);


  const subId = params?.id;
  const [sub, setSub] = useState(null);
  const [student, setStudent] = useState(null);
  const [a, setA] = useState(null);
  const [rubric, setRubric] = useState(null);
  const [gradable, setGradable] = useState([]);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!subId) return;
      const { data: sData } = await supabase.from("submissions").select("*").eq("id", subId).single();
      if (!sData) { setLoading(false); return; }
      
      const [uRes, aRes, subsRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", sData.student_id).single(),
        supabase.from("assignments").select("*").eq("id", sData.assignment_id).single(),
        supabase.from("submissions").select("*").eq("assignment_id", sData.assignment_id).neq("status", "not-submitted")
      ]);
      
      let rubData = null;
      if (aRes.data?.rubric_id) {
         const { data: r2 } = await supabase.from("rubrics").select("*").eq("id", aRes.data.rubric_id).single();
         rubData = r2;
      }
      
      setSub(sData);
      setStudent(uRes.data || { name: "Unknown", student_no: "-", section: "-" });
      setA(aRes.data || { title: "Unknown", points: 100 });
      setRubric(rubData || { criteria: [] });
      setGradable(subsRes.data || []);
      
      if (rubData) {
         setScores(distributeScore(sData.score, rubData.criteria, aRes.data?.points || 100));
      }
      if (sData.score != null) {
         setFeedback("งานเขียนกระบวนการพยาบาลครบถ้วน จัดลำดับความสำคัญได้ดี ควรเพิ่มการอ้างอิงหลักฐานเชิงประจักษ์ที่ทันสมัย");
      }
      setLoading(false);
    }
    load();
  }, [subId]);

  if (loading) return <Loading fullHeight />;
  if (!sub || !student || !a) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบข้อมูลการส่งงาน</div>
            <div className="t-sm muted">ไม่พบรายละเอียดการส่งงานของนักเรียนคนนี้ หรือรหัสการส่งงานไม่ถูกต้อง</div>
          </div>
        </div>
      </div>
    );
  }

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const mobile = false;
  const idx = gradable.findIndex((s) => s.id === sub.id);

  const handleSaveScore = async (statusToSet) => {
    try {
      const { error } = await supabase
        .from("submissions")
        .update({
          score: total,
          status: statusToSet,
        })
        .eq("id", sub.id);
        
      if (error) throw error;
      
      toast(statusToSet === "graded" ? "ส่งคะแนนและข้อเสนอแนะแล้ว" : "บันทึกฉบับร่างแล้ว");
      
      setTimeout(() => {
        if (statusToSet === "graded" && idx !== -1 && idx < gradable.length - 1) {
          nav("/i/grade/" + gradable[idx + 1].id);
        } else {
          nav("/i/submissions/" + a.id);
        }
      }, 700);
    } catch (err) {
      console.error("Error saving score:", err);
      toast("เกิดข้อผิดพลาดในการบันทึกคะแนน: " + err.message);
    }
  };

  return (
    <div style={{ background: "#f4f6f8", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center gap-3 px-4" style={{ height: 56, flex: "0 0 56px", borderBottom: "1px solid var(--border)", background: "#fff", padding: "0 16px" }}>
        <button className="iconbtn ghost" onClick={() => nav("/i/submissions/" + a.id)}><Icon name="arrL" size={18} /></button>
        <div className="flex-1" style={{ minWidth: 0 }}><div className="t-xs muted truncate">{a.title}</div><div className="t-sm fw-7 truncate">ตรวจงาน — {student.name}</div></div>
        <span className="t-xs muted hide-m">งานที่ {idx + 1}/{gradable.length}</span>
        <button className="iconbtn ghost hide-m" disabled={idx <= 0} onClick={() => nav("/i/grade/" + gradable[idx - 1]?.id)}><Icon name="chevL" size={18} /></button>
        <button className="iconbtn ghost hide-m" disabled={idx === -1 || idx >= gradable.length - 1} onClick={() => nav("/i/grade/" + gradable[idx + 1]?.id)}><Icon name="chevR" size={18} /></button>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", height: "100%", flexDirection: mobile ? "column" : "row" }}>
          {/* document viewer */}
          <div className="flex-1" style={{ minWidth: 0, padding: mobile ? 16 : 24, overflow: "auto" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Avatar name={student.name} size={34} /><div><div className="fw-6">{student.name}</div><div className="t-xs muted">{student.student_no || "-"} · {student.section || "-"}</div></div></div>
              <div className="flex items-center gap-2">{sub.late && <Badge tone="warning" dot>ส่งล่าช้า</Badge>}{statusBadge(sub.status)}</div>
            </div>
            {sub.file ? (
              <>
                <div className="card card-p mb-3 flex items-center gap-3">
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="file" size={18} /></div>
                  <div className="flex-1">
                    <div className="t-sm fw-6 truncate">
                      {sub.file.startsWith("http") || sub.file.includes("/") ? sub.file.split("/").pop().replace(/^\d+_/, "") : sub.file}
                    </div>
                    <div className="t-xs muted">ส่งเมื่อ {sub.submitted_at}</div>
                  </div>
                  <a 
                    href={sub.file} 
                    download={sub.file.split("/").pop()} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-outline btn-sm"
                    style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Icon name="download" size={14} />ดาวน์โหลด
                  </a>
                </div>
                {sub.file.toLowerCase().endsWith(".pdf") ? (
                  <div style={{ width: "100%", height: mobile ? 450 : 680, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", background: "#fff" }}>
                    <iframe
                      src={`${sub.file}#toolbar=1`}
                      width="100%"
                      height="100%"
                      style={{ border: "none" }}
                      title="PDF Preview"
                    />
                  </div>
                ) : (/\.(jpe?g|png|webp|gif)$/i.test(sub.file)) ? (
                  <div style={{ width: "100%", display: "flex", justifyContent: "center", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", background: "#fff", padding: 12 }}>
                    <img
                      src={sub.file}
                      alt="Student submission preview"
                      style={{ maxWidth: "100%", maxHeight: mobile ? 450 : 680, objectFit: "contain", borderRadius: 8 }}
                    />
                  </div>
                ) : (
                  <Ph label="ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้" h={mobile ? 320 : 520} />
                )}
              </>
            ) : null}

            {sub.text ? (
              <div className="card card-p mb-3" style={{ borderLeft: "4px solid var(--primary)" }}>
                <div className="t-sm fw-7 mb-2 flex items-center gap-2">
                  <Icon name="msg" size={16} className="c-primary" />
                  คำตอบของนักศึกษา (แบบข้อความ)
                </div>
                <div className="lead pretty" style={{ padding: 14, borderRadius: 11, background: "var(--muted)", whiteSpace: "pre-line", fontSize: 14 }}>
                  {sub.text}
                </div>
              </div>
            ) : null}
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
                    <div className="t-sm fw-7 tnum" style={{ whiteSpace: "nowrap" }}><span className="c-primary">{scores[c.id] || 0}</span><span className="muted">/{c.max}</span></div>
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
              <button className="btn btn-outline flex-1" onClick={() => handleSaveScore(sub.status)}>บันทึกร่าง</button>
              <button className="btn btn-primary flex-1" onClick={() => handleSaveScore("graded")}><Icon name="check" size={15} />ให้คะแนน</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
