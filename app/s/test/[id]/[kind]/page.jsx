"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Dialog } from "@/components/ui/Primitives";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import { useIsMobile } from "@/lib/hooks";

export default function TestTaking() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const studentId = session?.user?.id || session?.dbId;
  const nav = (path) => router.push(path);

  const lessonId = params?.id;
  const kind = params?.kind || "pre"; // pre | post
  
  const [lesson, setLesson] = useState(null);
  const [qs, setQs] = useState([]);
  const [testScore, setTestScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!lessonId) return;
      
      const queries = [
        supabase.from("lessons").select("*").eq("id", lessonId).single(),
        supabase.from("questions").select("*").eq("lesson_id", lessonId).eq("kind", kind).order("no", { ascending: true })
      ];
      if (studentId) {
        queries.push(supabase.from("test_scores").select("*").eq("student_id", studentId).eq("lesson_id", lessonId).maybeSingle());
      }
      
      const results = await Promise.all(queries);
      const lRes = results[0];
      const qRes = results[1];
      const tsRes = studentId ? results[2] : null;

      const isStaff = role === "instructor" || role === "admin";
      if (lRes.data && lRes.data.status === "draft" && !isStaff) {
        setLesson(null);
        setQs([]);
        setLoading(false);
        return;
      }
      setLesson(lRes.data);
      setQs(qRes.data || []);
      if (tsRes && tsRes.data) {
        setTestScore(tsRes.data);
      }

      // Calculate time limit in seconds from database settings
      const testConfig = kind === "pre" ? lRes.data?.pretest : lRes.data?.posttest;
      const configLimit = testConfig?.time_limit ?? 30;
      const limitSeconds = parseInt(configLimit, 10) * 60;

      if (typeof window !== "undefined") {
        const saved = sessionStorage.getItem(`test_timer_${lessonId}_${kind}`);
        if (saved) {
          const remaining = parseInt(saved, 10);
          setTimeLeft(remaining > 0 ? remaining : limitSeconds);
        } else {
          setTimeLeft(limitSeconds);
        }
      } else {
        setTimeLeft(limitSeconds);
      }

      setLoading(false);
    }
    load();
  }, [lessonId, role, studentId]);

  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [confirm, setConfirm] = useState(false);
  
  const mobile = useIsMobile();

  // Real-time countdown timer starting at 30 minutes (1800 seconds) by default
  // Session storage ensures it survives accidental page refreshes
  const [timeLeft, setTimeLeft] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`test_timer_${lessonId}_${kind}`);
      if (saved) {
        const remaining = parseInt(saved, 10);
        return remaining > 0 ? remaining : 1800;
      }
    }
    return 1800;
  });

  const answersRef = React.useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (loading) return;

    if (typeof window !== "undefined") {
      sessionStorage.setItem(`test_timer_${lessonId}_${kind}`, timeLeft.toString());
    }

    if (timeLeft <= 0) {
      submit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

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

  const isStaff = role === "instructor" || role === "admin";
  const testConfig = kind === "pre" ? lesson?.pretest : lesson?.posttest;
  const maxAttempts = testConfig?.attempts ?? "1";
  const existingScore = testScore ? (kind === "pre" ? testScore.pre : testScore.post) : null;
  const hasTaken = existingScore !== null && existingScore !== undefined;
  const blockedByAttempts = !isStaff && maxAttempts === "1" && hasTaken;

  const due = testConfig?.due;
  const dueTime = testConfig?.due_time || "23:59";
  const isPastDue = !isStaff && evaluateIsPastDue(due, dueTime);

  if (loading) return <Loading text="กำลังโหลดข้อสอบ..." fullHeight />;
  if (!lesson || qs.length === 0) return <div style={{ background: "#f7f9fb", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="muted">ไม่พบข้อสอบ</div></div>;

  if (isPastDue) {
    return (
      <div style={{ background: "#f7f9fb", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card text-center" style={{ maxWidth: 480, padding: "32px 24px", borderRadius: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon name="alert" size={24} />
          </div>
          <div className="t-lg fw-7 fg">เลยกำหนดเวลาทำข้อสอบแล้ว</div>
          <p className="muted t-sm mt-2 mb-4" style={{ margin: "8px 0 24px 0" }}>
            แบบทดสอบนี้ได้ปิดระบบแล้วเมื่อ {formatThaiDate(due, dueTime)} คุณจึงไม่สามารถเข้าทำข้อสอบหรือส่งคำตอบได้อีกต่อไป
          </p>
          <button className="btn btn-primary" onClick={() => nav("/s/lesson/" + lesson.id)}>
            <Icon name="arrL" size={16} />กลับสู่บทเรียน
          </button>
        </div>
      </div>
    );
  }

  if (blockedByAttempts) {
    return (
      <div style={{ background: "#f7f9fb", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card text-center" style={{ maxWidth: 480, padding: "32px 24px", borderRadius: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--warning-soft)", color: "var(--warning)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon name="alert" size={24} />
          </div>
          <div className="t-lg fw-7 fg">ไม่อนุญาตให้ทำแบบทดสอบเพิ่ม</div>
          <p className="muted t-sm mt-2 mb-4" style={{ margin: "8px 0 24px 0" }}>
            คุณได้ทำแบบทดสอบนี้ไปแล้ว และบทเรียนนี้กำหนดให้ทำแบบทดสอบได้เพียง 1 ครั้งเท่านั้น
          </p>
          <button className="btn btn-primary" onClick={() => nav("/s/lesson/" + lesson.id)}>
            <Icon name="arrL" size={16} />กลับสู่บทเรียน
          </button>
        </div>
      </div>
    );
  }

  const q = qs[cur];
  const answered = Object.keys(answers).length;

  const choose = (qid, cid) => setAnswers((a) => ({ ...a, [qid]: cid }));
  
  async function submit(isAuto = false) {
    if (!studentId) {
      toast("ไม่พบข้อมูลนักศึกษา กรุณาเข้าสู่ระบบใหม่", "error");
      return;
    }

    const activeAnswers = isAuto ? answersRef.current : answers;

    let correctCount = 0;
    qs.forEach((q) => {
      if (activeAnswers[q.id] === q.answer) {
        correctCount++;
      }
    });

    try {
      const { data: existing } = await supabase
        .from("test_scores")
        .select("*")
        .eq("student_id", studentId)
        .eq("lesson_id", lesson.id)
        .maybeSingle();

      const scoreObj = {
        student_id: studentId,
        lesson_id: lesson.id,
        total: qs.length,
      };

      if (kind === "pre") {
        scoreObj.pre = correctCount;
        scoreObj.pre_answers = activeAnswers;
        if (existing) {
          scoreObj.post = existing.post;
          scoreObj.post_answers = existing.post_answers;
        }
      } else {
        scoreObj.post = correctCount;
        scoreObj.post_answers = activeAnswers;
        if (existing) {
          scoreObj.pre = existing.pre;
          scoreObj.pre_answers = existing.pre_answers;
        }
      }

      const { error } = await supabase
        .from("test_scores")
        .upsert(scoreObj, { onConflict: "student_id,lesson_id" });

      if (error) throw error;
      
      // Clear saved timer upon successful completion
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`test_timer_${lessonId}_${kind}`);
      }

      nav("/s/test/" + lesson.id + "/" + kind + "/result");
    } catch (err) {
      console.error("Error saving test score:", err);
      toast("เกิดข้อผิดพลาดในการบันทึกคะแนน: " + err.message, "error");
    }
  }

  return (
    <div style={{ background: "#f7f9fb", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* exam top bar */}
      <div className="flex items-center gap-3 px-4" style={{ height: 58, flex: "0 0 58px", borderBottom: "1px solid var(--border)", background: "#fff", padding: "0 16px" }}>
        <button className="iconbtn ghost" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="x" size={18} /></button>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-xs muted">{kind === "pre" ? "แบบทดสอบก่อนเรียน (Pre-test)" : "แบบทดสอบหลังเรียน (Post-test)"}</div>
          <div className="t-sm fw-7 truncate">บทที่ {lesson.index} · {lesson.title}</div>
        </div>
        <div className="flex items-center gap-2 badge badge-muted" style={{ height: 30 }}><Icon name="clock" size={14} />{formatTime(timeLeft)}</div>
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
