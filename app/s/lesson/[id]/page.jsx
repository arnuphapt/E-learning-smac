"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, statusBadge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";

const evaluateIsPastDue = (due, dueTime) => {
  if (!due) return false;
  const localDateTimeStr = `${due}T${dueTime || "23:59"}:00`;
  const deadline = new Date(localDateTimeStr);
  return new Date() > deadline;
};

const formatThaiDate = (dateStr, timeStr) => {
  if (!dateStr) return "";
  const dateObj = new Date(dateStr + "T" + (timeStr || "23:59") + ":00");
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  const thDate = dateObj.toLocaleDateString('th-TH', options);
  return `${thDate} เวลา ${timeStr || "23:59"} น.`;
};

function ChecklistItem({ icon, label, sub, tone, action, onClick, active }) {
  const colors = { done: "var(--success)", current: "var(--primary)", todo: "var(--subtle)", locked: "var(--subtle)" };
  return (
    <div className={"flex items-center gap-3 " + (onClick ? "pointer" : "")} onClick={onClick}
      style={{ padding: "11px 12px", borderRadius: 11, background: active ? "var(--primary-soft)" : "transparent", transition: ".12s" }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", flex: "0 0 30px",
        background: tone === "done" ? "var(--success-soft)" : tone === "current" ? "var(--primary-soft)" : "var(--muted)",
        color: colors[tone]
      }}>
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

function VideoStage({ lesson, studentId, nav, gated, watchProgress, onProgressUpdate, isPrePastDue, preCount }) {
  const [playing, setPlaying] = React.useState(false);
  const [simulatedPct, setSimulatedPct] = React.useState(watchProgress);
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    setSimulatedPct(watchProgress);
  }, [watchProgress]);

  React.useEffect(() => {
    if (!playing || lesson.video_url) return;

    const interval = setInterval(() => {
      setSimulatedPct((prev) => {
        const next = Math.min(100, prev + 1);
        if (onProgressUpdate) onProgressUpdate(next);
        if (next >= 100) {
          setPlaying(false);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playing, lesson.video_url]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      const currentTime = videoRef.current.currentTime;
      if (duration > 0) {
        const pct = Math.floor((currentTime / duration) * 100);
        if (onProgressUpdate) onProgressUpdate(pct);
        setSimulatedPct(pct);
      }
    }
  };

  if (gated) {
    const preDue = lesson.pretest?.due;
    const preDueTime = lesson.pretest?.due_time || "23:59";
    return (
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0b1220", borderRadius: 14, overflow: "hidden", display: "grid", placeItems: "center" }}>
        <div className="ph" style={{ position: "absolute", inset: 0, borderRadius: 0, opacity: .12, border: 0 }} />
        <div style={{ position: "relative", textAlign: "center", color: "#fff", padding: 24, maxWidth: 440 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon name="lock" size={26} />
          </div>
          <div className="t-lg fw-7">บทเรียนนี้ถูกล็อกไว้</div>
          {isPrePastDue ? (
            <>
              <div style={{ color: "var(--danger)", marginTop: 6, fontSize: 13.5, fontWeight: 600 }} className="pretty">
                แบบทดสอบก่อนเรียนเลยกำหนดเวลาส่งแล้วเมื่อ {formatThaiDate(preDue, preDueTime)} คุณจึงไม่สามารถเข้าทำแบบทดสอบหรือรับชมบทเรียนนี้ได้
              </div>
              <button className="btn btn-muted btn-lg mt-4 disabled" disabled>
                <Icon name="lock" size={17} />เลยกำหนดเวลาทำข้อสอบแล้ว
              </button>
            </>
          ) : (
            <>
              <div style={{ color: "#94a3b8", marginTop: 6, fontSize: 13.5 }} className="pretty">
                กรุณาทำแบบทดสอบก่อนเรียน (Pre-test) ให้เสร็จก่อน จึงจะสามารถเข้าชมวิดีโอและเนื้อหาบทเรียนได้
              </div>
              <button className="btn btn-primary btn-lg mt-4" onClick={() => nav("/s/test/" + lesson.id + "/pre")}>
                <Icon name="clipboard" size={17} />เริ่มทำ Pre-test ({preCount} ข้อ)
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  if (lesson.video_url) {
    return (
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
        <video
          ref={videoRef}
          src={lesson.video_url}
          controls
          className="w-full h-full"
          style={{ display: "block", outline: "none" }}
          onTimeUpdate={handleTimeUpdate}
        />
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
          <div style={{ width: simulatedPct + "%", height: "100%", borderRadius: 99, background: "var(--primary)" }} />
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

function LessonAssignTab({ assignments, submissions, nav }) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <div className="ec"><Icon name="file" size={22} style={{ color: "var(--subtle)" }} /></div>
          <div className="t-sm muted">บทเรียนนี้ไม่มีใบงาน</div>
        </div>
      </div>
    );
  }

  const getStatus = (asgId) => {
    const sub = submissions.find(s => s.assignment_id === asgId);
    return sub ? sub.status : "not-submitted";
  };

  return (
    <div className="flex col gap-3">
      {assignments.map((a) => {
        const status = getStatus(a.id);
        return (
          <div key={a.id} className="card card-p flex items-center justify-between gap-3 wrap" style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="file" size={20} /></div>
              <div>
                <div className="fw-6">{a.title}</div>
                <div className="t-xs muted flex items-center gap-2 mt-1">
                  <Icon name="cal" size={13} />กำหนดส่ง {a.due} {a.due_time} <i className="dot-sep" /> {a.points} คะแนน
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(status)}
              <button className="btn btn-primary btn-sm" onClick={() => nav("/s/assignment/" + a.id)}>
                เปิดใบงาน<Icon name="arrR" size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NoVideoContentStage({ lesson, assignments, submissions, nav }) {
  const docs = lesson?.documents || [];
  const hasDocs = docs.length > 0;
  const hasAssigns = assignments && assignments.length > 0;

  if (!hasDocs && !hasAssigns) {
    return (
      <div className="card text-center animate-fade-in" style={{ padding: "48px 24px", background: "var(--muted)", borderRadius: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <Icon name="book" size={24} />
        </div>
        <div className="t-lg fw-7 fg">ไม่มีสื่อการเรียนการสอนแนบเพิ่มเติม</div>
        <p className="muted t-sm mt-2" style={{ margin: 0 }}>บทเรียนนี้ไม่มีวิดีโอ เอกสารแนบ หรือใบงานเพิ่มในบทเรียน</p>
      </div>
    );
  }

  const getStatus = (asgId) => {
    const sub = submissions.find(s => s.assignment_id === asgId);
    return sub ? sub.status : "not-submitted";
  };

  return (
    <div className="flex col gap-4 w-full">
      {hasDocs && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-h" style={{ background: "var(--primary-soft)", borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: "14px 18px" }}>
            <div className="title flex items-center gap-2 c-primary"><Icon name="folder" size={18} />เอกสารประกอบการเรียน</div>
          </div>
          <div className="card-p flex col gap-3" style={{ padding: 18 }}>
            {docs.map((doc, i) => (
              <div key={i} className="flex items-center gap-3" style={{ padding: "14px 18px", border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="file" size={20} /></div>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="fw-6 t-sm truncate fg">{doc.name}</div>
                  <div className="t-xs muted">{doc.size}</div>
                </div>
                {lesson.allow_download ?? true ? (
                  <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="download" size={15} />ดาวน์โหลด
                  </a>
                ) : (
                  <span className="t-xs muted flex items-center gap-1" style={{ padding: "6px 12px", background: "var(--muted)", borderRadius: 8 }}><Icon name="lock" size={13} />ไม่อนุญาตให้ดาวน์โหลด</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAssigns && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-h" style={{ background: "var(--primary-soft)", borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: "14px 18px" }}>
            <div className="title flex items-center gap-2 c-primary"><Icon name="file" size={18} />ใบงานสำหรับบทเรียนนี้</div>
          </div>
          <div className="card-p flex col gap-3" style={{ padding: 18 }}>
            {assignments.map((a) => {
              const status = getStatus(a.id);
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 wrap" style={{ padding: "16px 20px", border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="file" size={22} /></div>
                    <div>
                      <div className="fw-7 t-sm fg">{a.title}</div>
                      {a.instructions && (
                        <p className="t-xs muted mt-1 pretty" style={{ whiteSpace: "pre-line", margin: "4px 0 0 0", maxWidth: 500 }}>
                          {a.instructions}
                        </p>
                      )}
                      <div className="t-xs muted flex items-center gap-2 mt-2">
                        <Icon name="cal" size={13} />กำหนดส่ง {a.due} {a.due_time} <i className="dot-sep" /> {a.points} คะแนน
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(status)}
                    <button className="btn btn-primary btn-sm" onClick={() => nav("/s/assignment/" + a.id)}>
                      เปิดใบงาน<Icon name="arrR" size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
    } catch (e) { }
  }, [key]);

  const handleSave = () => {
    try {
      localStorage.setItem(key, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { }
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
  const [assignments, setAssignments] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const isTabVisible = (t) => {
    if (t === "overview") return true;
    if (t === "docs") return !!lesson?.has_docs;
    if (t === "assign") return !!lesson?.has_assignment;
    return false;
  };

  useEffect(() => {
    if (lesson && !isTabVisible(tab)) {
      setTab("overview");
    }
  }, [lesson?.has_docs, lesson?.has_assignment, tab]);
  const [testScore, setTestScore] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [watchProgress, setWatchProgress] = useState(0);
  const [questionCounts, setQuestionCounts] = useState({ pre: 0, post: 0 });

  useEffect(() => {
    if (typeof window !== "undefined" && studentId && lessonId) {
      const saved = localStorage.getItem(`watch_progress_${studentId}_${lessonId}`);
      if (saved) {
        setWatchProgress(parseInt(saved, 10));
      } else {
        setWatchProgress(0);
      }
    }
  }, [studentId, lessonId]);

  const handleProgressUpdate = (pct) => {
    setWatchProgress((prev) => {
      if (pct > prev) {
        if (typeof window !== "undefined" && studentId) {
          localStorage.setItem(`watch_progress_${studentId}_${lessonId}`, pct.toString());
        }
        return pct;
      }
      return prev;
    });
  };

  useEffect(() => {
    async function load() {
      if (!lessonId) return;
      const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
      if (!lData) { setLoading(false); return; }

      if (lData.status === "draft") {
        setLesson(null);
        setLoading(false);
        return;
      }

      const queries = [
        supabase.from("courses").select("*").eq("id", lData.course_id).single(),
        supabase.from("assignments").select("*").eq("lesson_id", lessonId),
        supabase.from("lessons").select("*").eq("course_id", lData.course_id).order("index", { ascending: true }),
        supabase.from("questions").select("id, kind").eq("lesson_id", lessonId)
      ];

      if (studentId) {
        queries.push(supabase.from("test_scores").select("*").eq("student_id", studentId).eq("lesson_id", lessonId).maybeSingle());
      }

      const results = await Promise.all(queries);
      const cRes = results[0];
      const aRes = results[1];
      const allRes = results[2];
      const qRes = results[3];
      const tsRes = studentId ? results[4] : null;

      setLesson(lData);
      setCourse(cRes.data || { id: "c1", code: "Unknown" });

      const fetchedAssignments = aRes.data || [];
      setAssignments(fetchedAssignments);

      let fetchedAllLessons = allRes.data || [];
      fetchedAllLessons = fetchedAllLessons.filter(l => l.status !== "draft");
      setAllLessons(fetchedAllLessons);

      const qsList = qRes.data || [];
      const preCount = qsList.filter(q => q.kind === "pre").length;
      const postCount = qsList.filter(q => q.kind === "post").length;
      setQuestionCounts({ pre: preCount, post: postCount });

      if (tsRes && tsRes.data) {
        setTestScore(tsRes.data);
      }

      if (studentId && fetchedAssignments.length > 0) {
        const assignmentIds = fetchedAssignments.map(a => a.id);
        const { data: subData } = await supabase.from("submissions").select("*").eq("student_id", studentId).in("assignment_id", assignmentIds);
        setSubmissions(subData || []);
      } else {
        setSubmissions([]);
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

  const pre = {
    required: lesson.pretest?.required ?? true,
    taken: testScore ? (testScore.pre !== null && testScore.pre !== undefined) : false,
    score: testScore ? testScore.pre : 0,
    total: testScore ? testScore.total : questionCounts.pre
  };

  const post = {
    required: lesson.posttest?.required ?? true,
    taken: testScore ? (testScore.post !== null && testScore.post !== undefined) : false,
    score: testScore ? testScore.post : 0,
    total: testScore ? testScore.total : questionCounts.post
  };

  const gated = lesson.has_pretest && pre.required && !pre.taken;
  const hasNoVideo = !lesson.video || !lesson.video_url;

  const isPostGated = false;

  const preDue = lesson.pretest?.due;
  const preDueTime = lesson.pretest?.due_time || "23:59";
  const isPrePastDue = !pre.taken && evaluateIsPastDue(preDue, preDueTime);

  const postDue = lesson.posttest?.due;
  const postDueTime = lesson.posttest?.due_time || "23:59";
  const isPostPastDue = !post.taken && evaluateIsPastDue(postDue, postDueTime);

  const SideRail = (
    <div className="flex col gap-4">
      {/* AI Tutor Card */}
      {lesson.allow_ai !== false && (
        <div className="card animate-fade-in" style={{
          background: "linear-gradient(135deg, var(--primary-soft) 0%, rgba(8,145,178,0.06) 100%)",
          border: "1px solid rgba(13,110,140,0.18)",
          borderRadius: 14,
          overflow: "hidden"
        }}>
          <div className="card-p" style={{ padding: "16px 18px" }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: "var(--primary)" }}>
              <Icon name="sparkle" size={17} />
              <span className="fw-7 style-sm" style={{ fontSize: "14px", fontWeight: 700 }}>AI ผู้ช่วยเรียนรู้</span>
            </div>
            <p className="muted t-xs mb-3" style={{ margin: 0, lineHeight: 1.5 }}>
              มีข้อสงสัยเกี่ยวกับบทเรียนหรือต้องการสรุปเนื้อหาสำคัญ? ถาม AI ติวเตอร์ได้ทันที!
            </p>
            <button className="btn btn-primary btn-sm w-full" onClick={() => nav(`/s/lesson/${lesson.id}/ai`)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="sparkle" size={14} />คุยกับ AI ติวเตอร์
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h"><div className="title t-base">ความคืบหน้าบทเรียน</div></div>
        <div style={{ padding: 8 }}>
          {lesson.has_pretest && pre.required && (
            <ChecklistItem icon={pre.taken ? "checkC" : "clipboard"} tone={pre.taken ? "done" : isPrePastDue ? "locked" : "current"}
              label="Pre-test" sub={pre.taken ? `ทำแล้ว · ${pre.score}/${pre.total} คะแนน` : isPrePastDue ? `เลยกำหนดส่งเมื่อ ${formatThaiDate(preDue, preDueTime)}` : "ต้องทำก่อนเข้าเรียน"}
              onClick={() => isPrePastDue ? toast("เลยกำหนดเวลาทำแบบทดสอบก่อนเรียนแล้ว") : nav(pre.taken ? "/s/test/" + lesson.id + "/pre/result" : "/s/test/" + lesson.id + "/pre")}
              action={<Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />
          )}
          {!hasNoVideo && (
            <ChecklistItem icon={watchProgress === 100 ? "checkC" : "playC"} tone={gated ? "locked" : watchProgress === 100 ? "done" : "current"}
              label="วิดีโอบทเรียน"
              sub={gated ? "ปลดล็อกหลังทำ Pre-test" : `ดูแล้ว ${watchProgress}%`} />
          )}
          {lesson.has_assignment && assignments.map((a) => {
            const sub = submissions.find((s) => s.assignment_id === a.id);
            const status = sub ? sub.status : "not-submitted";
            const tone = status === "graded" ? "done" : status === "submitted" ? "current" : "todo";
            const subText = status === "graded" ? `ตรวจแล้ว · ${sub.score}/${sub.total}` : status === "submitted" ? "ส่งแล้ว · รอตรวจ" : "ยังไม่ส่ง";
            return (
              <ChecklistItem key={a.id} icon="file" tone={tone}
                label={a.title} sub={subText}
                onClick={() => nav("/s/assignment/" + a.id)}
                action={<Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />
            );
          })}
          {lesson.has_posttest && post.required && <ChecklistItem icon={post.taken ? "checkC" : "clipboard"} tone={post.taken ? "done" : isPostPastDue ? "locked" : (gated || isPostGated) ? "locked" : "todo"}
            label="Post-test" sub={post.taken ? `ทำแล้ว · ${post.score}/${post.total}` : isPostPastDue ? `เลยกำหนดส่งเมื่อ ${formatThaiDate(postDue, postDueTime)}` : gated ? "ปลดล็อกหลังเรียนจบ" : isPostGated ? `ต้องดูวิดีโอให้ครบ 80% (ขณะนี้ ${watchProgress}%)` : "พร้อมให้ทำแล้ว"}
            onClick={() => {
              if (isPostPastDue) {
                toast("เลยกำหนดเวลาทำแบบทดสอบหลังเรียนแล้ว");
              } else if (!(gated || isPostGated)) {
                nav(post.taken ? "/s/test/" + lesson.id + "/post/result" : "/s/test/" + lesson.id + "/post");
              }
            }}
            action={!(gated || isPostGated) && !post.taken && !isPostPastDue ? <span className="btn btn-soft btn-sm">ทำเลย</span> : <Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />}
        </div>
      </div>
      <LessonNotes studentId={studentId} lessonId={lesson.id} />
      <NextLessonCard lesson={lesson} nav={nav} allLessons={allLessons} />
    </div>
  );

  if (gated && hasNoVideo) {
    return (
      <div className="container">
        <Crumb nav={nav} items={[{ label: "รายวิชาของฉัน", to: "/s/courses" }, { label: course.code, to: "/s/course/" + course.id }, { label: "บทที่ " + lesson.index }]} />
        <div className="card text-center" style={{ maxWidth: 600, margin: "40px auto", padding: "40px 24px", borderRadius: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
            <Icon name="lock" size={32} />
          </div>
          <div className="t-xl fw-7 fg">บทเรียนนี้ถูกล็อกไว้</div>
          {isPrePastDue ? (
            <>
              <p style={{ color: "var(--danger)", marginTop: 12, fontSize: 15, lineHeight: 1.6, maxWidth: 460, margin: "12px auto 24px" }} className="pretty fw-6">
                แบบทดสอบก่อนเรียนเลยกำหนดเวลาส่งแล้วเมื่อ {formatThaiDate(preDue, preDueTime)} คุณจึงไม่สามารถเข้าทำแบบทดสอบหรือเข้าสู่บทเรียนนี้ได้
              </p>
              <button className="btn btn-muted btn-lg disabled" style={{ padding: "12px 28px" }} disabled>
                <Icon name="lock" size={18} />เลยกำหนดเวลาทำข้อสอบแล้ว
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "var(--muted-fg)", marginTop: 12, fontSize: 15, lineHeight: 1.6, maxWidth: 460, margin: "12px auto 24px" }} className="pretty">
                กรุณาทำแบบทดสอบก่อนเรียน (Pre-test) ให้เสร็จก่อน จึงจะสามารถเข้าเรียนและดูเนื้อหาบทเรียนได้
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => nav("/s/test/" + lesson.id + "/pre")} style={{ padding: "12px 28px" }}>
                <Icon name="clipboard" size={18} />เริ่มทำ Pre-test ({questionCounts.pre} ข้อ)
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: "รายวิชาของฉัน", to: "/s/courses" }, { label: course.code, to: "/s/course/" + course.id }, { label: "บทที่ " + lesson.index }]} />
      <div className="flex gap-5 items-start" style={{ flexDirection: mobile ? "column" : "row" }}>
        <div className="flex-1" style={{ minWidth: 0 }}>
          {hasNoVideo ? (
            <NoVideoContentStage lesson={lesson} assignments={assignments} submissions={submissions} nav={nav} />
          ) : (
            <VideoStage lesson={lesson} studentId={studentId} nav={nav} gated={gated} watchProgress={watchProgress} onProgressUpdate={handleProgressUpdate} isPrePastDue={isPrePastDue} preCount={questionCounts.pre} />
          )}
          <div className="flex items-start justify-between gap-3 mt-4 wrap">
            <div>
              <div className="t-xs fw-6 c-primary uppercase mb-1">บทที่ {lesson.index} · {course.code}</div>
              <div className="t-xl fw-7 serif pretty" style={{ letterSpacing: "-.01em" }}>{lesson.title}</div>
              <div className="flex items-center gap-2 mt-2 t-sm muted wrap">
                <span className="flex items-center gap-1"><Icon name="video" size={14} />{lesson.duration}</span>
                <i className="dot-sep" />{statusBadge(lesson.status)}
              </div>
            </div>
            {!gated && !hasNoVideo && (
              <button
                className={`btn btn-sm ${watchProgress === 100 ? "" : "btn-outline"}`}
                style={
                  watchProgress === 100
                    ? { background: "var(--success-soft)", color: "var(--success)", border: "1px solid var(--success)", cursor: "default" }
                    : {}
                }
                onClick={() => handleProgressUpdate(100)}
                disabled={watchProgress === 100}
              >
                <Icon name="check" size={15} />
                {watchProgress === 100 ? "เรียนจบแล้ว" : "ทำเครื่องหมายว่าเรียนจบ"}
              </button>
            )}
          </div>

          {hasNoVideo && !lesson.has_docs && !lesson.has_assignment ? (
            <div className="mt-4">
              <LessonOverview lesson={lesson} />
            </div>
          ) : (
            <>
              <div className="tabs mt-5">
                {[
                  ["overview", "ภาพรวม", "book"],
                  ...(lesson.has_docs ? [["docs", "เอกสารประกอบ", "folder"]] : []),
                  ...(lesson.has_assignment ? [["assign", "ใบงาน", "file"]] : [])
                ].map(([k, t, ic]) => (
                  <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
                ))}
              </div>
              <div className="mt-4">
                {tab === "overview" && <LessonOverview lesson={lesson} />}
                {tab === "docs" && <LessonDocs lesson={lesson} allowDownload={lesson.allow_download ?? true} />}
                {tab === "assign" && <LessonAssignTab assignments={assignments} submissions={submissions} nav={nav} />}
              </div>
            </>
          )}
          {mobile && <div className="mt-5">{SideRail}</div>}
        </div>
        {!mobile && <div style={{ width: 330, flex: "0 0 330px", position: "sticky", top: 18 }}>{SideRail}</div>}
      </div>
    </div>
  );
}
