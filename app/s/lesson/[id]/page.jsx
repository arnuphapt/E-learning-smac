"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, statusBadge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

function ChecklistItem({ icon, label, sub, tone, action, onClick, active }) {
  const colors = { done: "var(--success)", current: "var(--primary)", todo: "var(--subtle)", locked: "var(--subtle)" };
  return (
    <div className={"flex items-center gap-3 " + (onClick ? "pointer" : "")} onClick={onClick}
      style={{ padding: "11px 12px", borderRadius: 11, background: active ? "var(--primary-soft)" : "transparent", transition: ".12s" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", flex: "0 0 30px",
        background: tone === "done" ? "var(--success-soft)" : tone === "current" ? "var(--primary-soft)" : "var(--muted)",
        color: colors[tone] }}>
        <Icon name={icon} size={16} />
      </div>
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="t-sm fw-6 truncate">{label}</div>
        {sub && <div className="t-xs muted truncate">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function VideoStage({ lesson, nav, gated }) {
  const [playing, setPlaying] = React.useState(false);
  if (gated) {
    return (
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0b1220", borderRadius: 14, overflow: "hidden", display: "grid", placeItems: "center" }}>
        <div className="ph" style={{ position: "absolute", inset: 0, borderRadius: 0, opacity: .12, border: 0 }} />
        <div style={{ position: "relative", textAlign: "center", color: "#fff", padding: 24, maxWidth: 440 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon name="lock" size={26} />
          </div>
          <div className="t-lg fw-7">บทเรียนนี้ถูกล็อกไว้</div>
          <div style={{ color: "#94a3b8", marginTop: 6, fontSize: 13.5 }} className="pretty">
            กรุณาทำแบบทดสอบก่อนเรียน (Pre-test) ให้เสร็จก่อน จึงจะสามารถเข้าชมวิดีโอและเนื้อหาบทเรียนได้
          </div>
          <button className="btn btn-primary btn-lg mt-4" onClick={() => nav("/s/test/" + lesson.id + "/pre")}>
            <Icon name="clipboard" size={17} />เริ่มทำ Pre-test ({lesson.pretest?.questions || 10} ข้อ)
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", aspectRatio: "16/9", background: "#0b1220", borderRadius: 14, overflow: "hidden" }}>
      <div className="ph" style={{ position: "absolute", inset: 0, borderRadius: 0, opacity: .14, border: 0 }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <button onClick={() => setPlaying(!playing)} style={{ width: 72, height: 72, borderRadius: 99, border: 0, cursor: "pointer", background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 8px 30px rgba(13,110,140,.5)" }}>
          <Icon name={playing ? "pencil" : "play"} size={28} style={{ marginLeft: playing ? 0 : 3 }} />
        </button>
      </div>
      {/* control bar */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 16px 12px", background: "linear-gradient(transparent, rgba(0,0,0,.6))" }}>
        <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,.25)" }}>
          <div style={{ width: lesson.progress + "%", height: "100%", borderRadius: 99, background: "var(--primary)" }} />
        </div>
        <div className="flex items-center justify-between mt-2" style={{ color: "#fff" }}>
          <div className="flex items-center gap-3">
            <Icon name="play" size={16} /><Icon name="refresh" size={15} style={{ opacity: .8 }} />
            <span className="t-xs mono" style={{ opacity: .85 }}>29:18 / {(lesson.duration || "40 นาที").replace(" นาที", ":00")}</span>
          </div>
          <div className="flex items-center gap-3" style={{ opacity: .85 }}>
            <span className="t-xs">1.0x</span><Icon name="settings" size={15} /><Icon name="grid" size={15} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonOverview({ lesson }) {
  return (
    <div className="card card-p">
      <div className="t-base fw-7 mb-2">รายละเอียดบทเรียน</div>
      <p className="muted lead pretty" style={{ margin: 0, whiteSpace: "pre-line" }}>
        {lesson.description || "ไม่มีคำอธิบายบทเรียน"}
      </p>
    </div>
  );
}

function LessonDocs({ lesson, allowDownload = true }) {
  const docs = lesson?.documents || [];

  if (docs.length === 0) {
    return (
      <div className="card">
        <div className="empty" style={{ padding: "40px 0" }}>
          <div className="ec"><Icon name="folder" size={22} style={{ color: "var(--subtle)" }} /></div>
          <div className="t-sm muted">ไม่มีเอกสารประกอบการเรียนสำหรับบทเรียนนี้</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {docs.map((doc, i) => (
        <div key={i} className={"flex items-center gap-3 card-p " + (i < docs.length - 1 ? "border-b" : "")} style={{ padding: "14px 18px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="file" size={18} /></div>
          <div className="flex-1" style={{ minWidth: 0 }}>
            <div className="t-sm fw-6 truncate">{doc.name}</div>
            <div className="t-xs muted">{doc.size}</div>
          </div>
          {allowDownload ? (
            <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="download" size={15} />ดาวน์โหลด
            </a>
          ) : (
            <span className="t-xs muted flex items-center gap-1" style={{ padding: "6px 12px", background: "var(--muted)", borderRadius: 8 }}><Icon name="lock" size={13} />ไม่อนุญาตให้ดาวน์โหลด</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LessonAssignTab({ asg, nav }) {
  if (!asg) return <div className="card"><div className="empty"><div className="ec"><Icon name="file" size={22} /></div><div>บทเรียนนี้ไม่มีใบงาน</div></div></div>;
  const a = asg;
  return (
    <div className="card card-p flex items-center justify-between gap-3 wrap">
      <div className="flex items-center gap-3">
        <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="file" size={20} /></div>
        <div>
          <div className="fw-6">{a.title}</div>
          <div className="t-xs muted flex items-center gap-2 mt-1"><Icon name="cal" size={13} />กำหนดส่ง {a.due} <i className="dot-sep" /> {a.points} คะแนน</div>
        </div>
      </div>
      <div className="flex items-center gap-2">{statusBadge(asg.status)}<button className="btn btn-primary btn-sm" onClick={() => nav("/s/assignment/" + a.id)}>เปิดใบงาน<Icon name="arrR" size={15} /></button></div>
    </div>
  );
}

function LessonNotes({ studentId, lessonId }) {
  const key = `notes_${studentId || "guest"}_${lessonId}`;
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const val = localStorage.getItem(key);
      if (val) setNote(val);
    } catch (e) {}
  }, [key]);

  const handleSave = () => {
    try {
      localStorage.setItem(key, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
  };

  return (
    <div className="card">
      <div className="card-h"><div className="title t-base flex items-center gap-2"><Icon name="pencil" size={15} className="c-primary" />สมุดบันทึกของฉัน</div></div>
      <div className="card-p" style={{ paddingTop: 0 }}>
        <textarea 
          className="input" 
          rows={5} 
          placeholder="จดบันทึกระหว่างเรียน…" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
          style={{ width: "100%", resize: "vertical" }}
        />
        <div className="flex justify-end mt-3">
          <button className="btn btn-soft btn-sm" onClick={handleSave}>
            <Icon name="check" size={15} />
            {saved ? "บันทึกสำเร็จ" : "บันทึกโน้ต"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NextLessonCard({ lesson, nav, allLessons }) {
  const all = allLessons;
  const idx = all.findIndex((l) => l.id === lesson.id);
  const next = all[idx + 1];
  if (!next) return null;
  return (
    <div className="card pointer" onClick={() => nav("/s/lesson/" + next.id)}>
      <div className="card-p flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--muted)", display: "grid", placeItems: "center", flex: "0 0 44px" }}>
          <Icon name={next.status === "locked-pretest" ? "lock" : "play"} size={18} style={{ color: "var(--subtle)" }} />
        </div>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-xs muted">บทเรียนถัดไป</div>
          <div className="t-sm fw-6 truncate">บทที่ {next.index} · {next.title}</div>
        </div>
        <Icon name="chevR" size={18} style={{ color: "var(--subtle)" }} />
      </div>
    </div>
  );
}

export default function StudentLesson() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const nav = (path) => router.push(path);

  // In a real app, use media queries or a hook for 'device'. Here we'll default to desktop styling behavior for simplicity.
  const mobile = false;

  const lessonId = params?.id;
  const studentId = session?.dbId;
  const role = session?.user?.role;

  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [allLessons, setAllLessons] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [testScore, setTestScore] = useState(null);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    async function load() {
      if (!lessonId) return;
      const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
      if (!lData) { setLoading(false); return; }
      
      const isStaff = role === "instructor" || role === "admin";
      if (lData.status === "draft" && !isStaff) {
        setLesson(null);
        setLoading(false);
        return;
      }
      
      const queries = [
        supabase.from("courses").select("*").eq("id", lData.course_id).single(),
        supabase.from("assignments").select("*").eq("lesson_id", lessonId).single(),
        supabase.from("lessons").select("*").eq("course_id", lData.course_id).order("index", { ascending: true })
      ];

      if (studentId) {
        queries.push(supabase.from("test_scores").select("*").eq("student_id", studentId).maybeSingle());
      }

      const results = await Promise.all(queries);
      const cRes = results[0];
      const aRes = results[1];
      const allRes = results[2];
      const tsRes = studentId ? results[3] : null;

      setLesson(lData);
      setCourse(cRes.data || { id: "c1", code: "Unknown" });
      setAssignment(aRes.data);

      let fetchedAllLessons = allRes.data || [];
      if (!isStaff) {
        fetchedAllLessons = fetchedAllLessons.filter(l => l.status !== "draft");
      }
      setAllLessons(fetchedAllLessons);
      if (tsRes && tsRes.data) {
        setTestScore(tsRes.data);
      }

      if (studentId && aRes.data) {
        const { data: subData } = await supabase.from("submissions").select("*").eq("student_id", studentId).eq("assignment_id", aRes.data.id).maybeSingle();
        setSubmission(subData);
      }

      setLoading(false);
    }
    load();
  }, [lessonId, studentId, role]);

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

  const pre = lesson.pretest || { required: true, taken: false, questions: 10, total: 10, score: 0 };
  const post = lesson.posttest || { required: true, taken: false, questions: 10, total: 10, score: 0 };
  const asg = assignment ? { ...assignment, status: "todo" } : null;
  const gated = lesson.status === "locked-pretest" && !pre.taken;

  const watchProgress = lesson.progress || 0;
  const isPostGated = post.required && (lesson.watch_limit ?? true) && watchProgress < 80;

  const SideRail = (
    <div className="flex col gap-4">
      <div className="card">
        <div className="card-h"><div className="title t-base">ความคืบหน้าบทเรียน</div></div>
        <div style={{ padding: 8 }}>
          <ChecklistItem icon={pre.taken ? "checkC" : "clipboard"} tone={pre.taken ? "done" : "current"}
            label="Pre-test" sub={pre.taken ? `ทำแล้ว · ${pre.score}/${pre.total} คะแนน` : "ต้องทำก่อนเข้าเรียน"}
            onClick={() => nav("/s/test/" + lesson.id + "/pre")}
            action={<Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />
          <ChecklistItem icon="playC" tone={gated ? "locked" : "current"}
            label="วิดีโอบทเรียน" sub={gated ? "ปลดล็อกหลังทำ Pre-test" : `ดูแล้ว ${watchProgress}%`} />
          {asg && <ChecklistItem icon="file" tone={asg.status === "graded" ? "done" : asg.status === "submitted" ? "current" : "todo"}
            label="ใบงาน" sub={asg.status === "graded" ? `ตรวจแล้ว · ${asg.score}/${asg.total}` : asg.status === "submitted" ? "ส่งแล้ว · รอตรวจ" : "ยังไม่ส่ง"}
            onClick={() => nav("/s/assignment/" + asg.id)}
            action={<Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />}
          {post.required && <ChecklistItem icon={post.taken ? "checkC" : "clipboard"} tone={post.taken ? "done" : (gated || isPostGated) ? "locked" : "todo"}
            label="Post-test" sub={post.taken ? `ทำแล้ว · ${post.score}/${post.total}` : gated ? "ปลดล็อกหลังเรียนจบ" : isPostGated ? `ต้องดูวิดีโอให้ครบ 80% (ขณะนี้ ${watchProgress}%)` : "พร้อมให้ทำแล้ว"}
            onClick={() => !(gated || isPostGated) && nav("/s/test/" + lesson.id + "/post")}
            action={!(gated || isPostGated) && !post.taken ? <span className="btn btn-soft btn-sm">ทำเลย</span> : <Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />}
        </div>
      </div>
      <LessonNotes studentId={studentId} lessonId={lesson.id} />
      <NextLessonCard lesson={lesson} nav={nav} allLessons={allLessons} />
    </div>
  );

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: "รายวิชาของฉัน", to: "/s/courses" }, { label: course.code, to: "/s/course/" + course.id }, { label: "บทที่ " + lesson.index }]} />
      <div className="flex gap-5 items-start" style={{ flexDirection: mobile ? "column" : "row" }}>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <VideoStage lesson={lesson} nav={nav} gated={gated} />
          <div className="flex items-start justify-between gap-3 mt-4 wrap">
            <div>
              <div className="t-xs fw-6 c-primary uppercase mb-1">บทที่ {lesson.index} · {course.code}</div>
              <div className="t-xl fw-7 serif pretty" style={{ letterSpacing: "-.01em" }}>{lesson.title}</div>
              <div className="flex items-center gap-2 mt-2 t-sm muted wrap">
                <span className="flex items-center gap-1"><Icon name="video" size={14} />{lesson.duration}</span>
                <i className="dot-sep" />{statusBadge(lesson.status)}
              </div>
            </div>
            {!gated && <button className="btn btn-outline btn-sm"><Icon name="check" size={15} />ทำเครื่องหมายว่าเรียนจบ</button>}
          </div>

          <div className="tabs mt-5">
            {[["overview", "ภาพรวม", "book"], ["docs", "เอกสารประกอบ", "folder"], ["assign", "ใบงาน", "file"]].map(([k, t, ic]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
            ))}
          </div>
          <div className="mt-4">
            {tab === "overview" && <LessonOverview lesson={lesson} />}
            {tab === "docs" && <LessonDocs lesson={lesson} allowDownload={lesson.allow_download ?? true} />}
            {tab === "assign" && <LessonAssignTab asg={asg} nav={nav} />}
          </div>
          {mobile && <div className="mt-5">{SideRail}</div>}
        </div>
        {!mobile && <div style={{ width: 330, flex: "0 0 330px", position: "sticky", top: 18 }}>{SideRail}</div>}
      </div>
    </div>
  );
}
