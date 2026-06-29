"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Ring } from "@/components/ui/Primitives";
import Loading from "@/components/ui/Loading";
import { useIsMobile } from "@/lib/hooks";

export default function TestResult() {
  const mobile = useIsMobile();
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const nav = (path) => router.push(path);

  const lessonId = params?.id;
  const kind = params?.kind || "pre";

  const studentId = session?.user?.id || session?.dbId;
  const role = session?.user?.role;

  const [lesson, setLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [testScore, setTestScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!lessonId) return;

      const [lRes, qRes] = await Promise.all([
        supabase.from("lessons").select("*").eq("id", lessonId).single(),
        supabase.from("questions").select("*").eq("lesson_id", lessonId).eq("kind", kind).order("no", { ascending: true })
      ]);

      const isStaff = role === "instructor" || role === "admin";
      if (lRes.data && lRes.data.status === "draft" && !isStaff) {
        setLesson(null);
        setQuestions([]);
        setLoading(false);
        return;
      }

      if (lRes.data) setLesson(lRes.data);
      if (qRes.data) setQuestions(qRes.data);

      if (studentId && lessonId) {
        const { data: tsRes } = await supabase
          .from("test_scores")
          .select("*")
          .eq("student_id", studentId)
          .eq("lesson_id", lessonId)
          .maybeSingle();
        if (tsRes) setTestScore(tsRes);
      }

      setLoading(false);
    }
    load();
  }, [lessonId, studentId, role]);

  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!lesson) {
    return (
      <div className="container p-5 text-center">
        <div className="card card-p">ไม่พบข้อมูลบทเรียน</div>
      </div>
    );
  }

  const total = questions.length || 10;
  const score = kind === "pre"
    ? (testScore ? testScore.pre : null) ?? Math.round(total * 0.7)
    : (testScore ? testScore.post : null) ?? Math.round(total * 0.9);

  const correct = score;
  const wrong = total - correct;

  const preScore = testScore?.pre ?? Math.round(total * 0.7);
  const postScore = testScore?.post ?? Math.round(total * 0.9);
  const diff = postScore - preScore;

  const showAnswers = kind === "pre"
    ? lesson?.pretest?.show_answers !== false
    : lesson?.posttest?.show_answers !== false;

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
                ? <div className="flex items-center gap-2 mt-3 t-sm" style={{ padding: "10px 13px", borderRadius: 10, background: "var(--success-soft)", color: "var(--success)" }}>
                    <Icon name="chart" size={16} />พัฒนาการจาก Pre-test: <b>{diff >= 0 ? `+${diff}` : diff} คะแนน</b> ({preScore} → {postScore})
                  </div>
                : <div className="flex items-center gap-2 mt-3 t-sm muted pretty">
                    <Icon name="sparkle" size={16} className="c-primary" />คะแนนนี้ใช้เพื่อประเมินความรู้พื้นฐานก่อนเรียน ระบบได้ปลดล็อกวิดีโอบทเรียนให้แล้ว
                  </div>}
            </div>
          </div>
        </div>

        {/* review */}
        <div className="flex items-center justify-between mb-3">
          <div className="t-md fw-7">เฉลยและคำอธิบาย</div>
          <span className="t-xs muted">{questions.length} ข้อ</span>
        </div>

        {showAnswers ? (
          <div className="flex col gap-3">
            {questions.map((q, i) => {
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
                         {q.choices && q.choices.map((ch) => {
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
        ) : (
          <div className="card card-p text-center py-5" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 99, background: "var(--muted)", color: "var(--muted-fg)", display: "grid", placeItems: "center" }}>
              <Icon name="lock" size={18} />
            </div>
            <div>
              <div className="fw-6 fg" style={{ fontSize: "15px" }}>ผู้สอนปิดการแสดงเฉลยคำตอบ</div>
              <div className="t-xs muted mt-1">คะแนนสอบของคุณถูกบันทึกเข้าระบบเรียบร้อยแล้ว แต่การแสดงเฉลยข้อสอบถูกระงับไว้โดยผู้สอน</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 gap-3 wrap">
          <button className="btn btn-outline" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="arrL" size={16} />กลับสู่บทเรียน</button>
          {kind === "pre"
            ? <button className="btn btn-primary btn-lg" onClick={() => nav("/s/lesson/" + lesson.id)}><Icon name="playC" size={17} />เริ่มชมวิดีโอบทเรียน</button>
            : <button className="btn btn-primary btn-lg" onClick={() => nav("/s/course/" + lesson.course_id)}>ไปบทเรียนถัดไป<Icon name="arrR" size={16} /></button>}
        </div>
      </div>
    </div>
  );
}
