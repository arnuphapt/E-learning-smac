"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Select } from "@/components/ui/Primitives";

function LiveRoomsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedQuizId = searchParams.get("quiz") || "";

  const { data: session, status: authStatus } = useSession();
  const userId = session?.user?.id || session?.user?.dbId || session?.user?.sub;

  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedQuiz, setSelectedQuiz] = useState(preselectedQuizId);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [restrictToCourse, setRestrictToCourse] = useState(true);
  const [teamMode, setTeamMode] = useState(false);
  const [teamCount, setTeamCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    if (preselectedQuizId) {
      setSelectedQuiz(preselectedQuizId);
    }
  }, [preselectedQuizId]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        // 1. Load quizzes owned by instructor
        const { data: qData } = await supabase
          .from("live_quizzes")
          .select("id, title, updated_at")
          .order("updated_at", { ascending: false });
        setQuizzes(qData || []);

        // 2. Load courses taught by instructor
        const { data: ciRows } = await supabase
          .from("course_instructors")
          .select("course_id")
          .eq("user_id", userId);

        const courseIds = (ciRows || []).map((r) => r.course_id);
        let cList = [];
        if (courseIds.length > 0) {
          const { data: cData } = await supabase
            .from("courses_all")
            .select('id, code, title')
            .in("id", courseIds)
            .order("code", { ascending: true });
          cList = cData || [];
        } else {
          // Fallback or admin
          const { data: cData } = await supabase
            .from("courses_all")
            .select('id, code, title')
            .limit(50);
          cList = cData || [];
        }
        setCourses(cList);
        if (cList.length > 0 && !selectedCourse) {
          setSelectedCourse(cList[0].id);
        }

        // 3. Load live sessions hosted by instructor
        const { data: sData } = await supabase
          .from("live_sessions")
          .select("id, course_id, title, pin, phase, total, restrict_to_course, team_mode, created_at, ended_at")
          .eq("host_id", userId)
          .order("created_at", { ascending: false });
        setSessions(sData || []);
      } catch (err) {
        console.error("Failed to load live quiz host data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId, authStatus]);

  async function handleCreateSession(e) {
    e.preventDefault();
    setFormError("");
    setInfoNotice("");
    setProblems([]);

    if (!selectedQuiz) {
      setFormError("กรุณาเลือกชุดควิซ");
      return;
    }
    if (!selectedCourse) {
      setFormError("กรุณาเลือกรายวิชา");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: selectedQuiz,
          course_id: selectedCourse,
          restrict_to_course: restrictToCourse,
          team_mode: teamMode,
          team_count: teamMode ? Number(teamCount) : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 422) {
        setFormError(data.error || "ชุดควิซไม่พร้อมใช้งาน");
        setProblems(data.problems || []);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        setFormError(data.error || "ไม่สามารถเปิดห้องได้");
        setSubmitting(false);
        return;
      }

      if (teamMode && data.teamsCreated === false) {
        setInfoNotice("ใช้ทีมเดิมของรายวิชา");
        setTimeout(() => {
          router.push(`/i/live/${data.id}`);
        }, 1200);
        return;
      }

      // Success -> navigate to host room
      router.push(`/i/live/${data.id}`);
    } catch (err) {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  const ongoingSessions = sessions.filter((s) => s.phase !== "ended");
  const endedSessions = sessions.filter((s) => s.phase === "ended");

  return (
    <div className="container">
      {/* Header */}
      <div className="flex wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="t-2xl fw-7 fg mb-1">
            ควิซสดในห้องเรียน
          </h1>
          <p className="t-sm muted">
            เปิดห้องแข่งขันตอบคำถามแบบเรียลไทม์ผ่านจอโปรเจกเตอร์
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/i/live/quizzes"
            className="btn btn-outline"
          >
            <Icon name="help" size={16} />
            <span>คลังชุดควิซของฉัน</span>
          </Link>
        </div>
      </div>

      {/* Grid: Open Room Form (Left) & My Rooms (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Open Room Form */}
        <div className="lg:col-span-5 card card-p">
          <h2 className="t-lg fw-7 fg mb-1">เปิดห้องควิซใหม่</h2>
          <p className="t-xs muted mb-5">
            เลือกชุดคำถามและรายวิชาเพื่อรับ PIN เข้าห้อง
          </p>

          <form onSubmit={handleCreateSession}>
            {/* Quiz Selection */}
            <div className="field">
              <label className="label" htmlFor="live-quiz-select">
                ชุดควิซ <span className="c-danger">*</span>
              </label>
              {quizzes.length === 0 ? (
                <div
                  className="p-3 rounded border t-xs muted"
                  style={{ background: "var(--muted)", borderColor: "var(--border)" }}
                >
                  ยังไม่มีชุดควิซ{" "}
                  <Link
                    href="/i/live/quizzes"
                    className="c-primary fw-6"
                    style={{ textDecoration: "underline" }}
                  >
                    สร้างชุดควิซก่อน
                  </Link>
                </div>
              ) : (
                <Select
                  id="live-quiz-select"
                  value={selectedQuiz}
                  onChange={(e) => setSelectedQuiz(e.target.value)}
                  className="input"
                >
                  <option value="">-- เลือกชุดควิซ --</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            {/* Course Selection */}
            <div className="field">
              <label className="label" htmlFor="live-course-select">
                รายวิชาที่สอน <span className="c-danger">*</span>
              </label>
              <Select
                id="live-course-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="input"
              >
                <option value="">-- เลือกรายวิชา --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} ${c.title}` : c.title || c.id}
                  </option>
                ))}
              </Select>
            </div>

            {/* Play Mode Selection */}
            <div className="field">
              <label className="label">
                โหมดการเล่น
              </label>
              <div className="grid grid-2 gap-3 mb-3">
                <label
                  className="card card-p flex items-center gap-2.5 pointer transition"
                  style={{
                    padding: "12px 14px",
                    borderColor: !teamMode ? "var(--primary)" : "var(--border)",
                    background: !teamMode ? "var(--primary-soft)" : "var(--card)",
                  }}
                >
                  <input
                    type="radio"
                    name="playMode"
                    checked={!teamMode}
                    onChange={() => setTeamMode(false)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span className="t-xs fw-6 fg">เดี่ยว</span>
                </label>

                <label
                  className="card card-p flex items-center gap-2.5 pointer transition"
                  style={{
                    padding: "12px 14px",
                    borderColor: teamMode ? "var(--primary)" : "var(--border)",
                    background: teamMode ? "var(--primary-soft)" : "var(--card)",
                  }}
                >
                  <input
                    type="radio"
                    name="playMode"
                    checked={teamMode}
                    onChange={() => setTeamMode(true)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span className="t-xs fw-6 fg">ทีม</span>
                </label>
              </div>

              {teamMode && (
                <div
                  className="p-3 rounded border mb-3"
                  style={{ background: "var(--muted)", borderColor: "var(--border)" }}
                >
                  <label className="label t-xs mb-1" htmlFor="live-team-count">
                    จำนวนทีม (2–8 ทีม)
                  </label>
                  <Select
                    id="live-team-count"
                    value={teamCount}
                    onChange={(e) => setTeamCount(Number(e.target.value))}
                    className="input"
                    style={{ height: 36, fontSize: "12.5px" }}
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} ทีม
                      </option>
                    ))}
                  </Select>
                  <p className="t-xs muted mt-1.5" style={{ fontSize: "11px", margin: 0 }}>
                    ใช้เฉพาะรายวิชาที่ยังไม่มีทีม ถ้ามีทีมแล้วระบบใช้ทีมเดิม
                  </p>
                </div>
              )}
            </div>

            {/* Lock Options */}
            <div className="field">
              <label className="label">
                สิทธิ์การเข้าร่วมห้อง
              </label>
              <div className="flex col gap-2">
                <label
                  className="card card-p flex items-start gap-3 pointer transition"
                  style={{
                    padding: "12px 14px",
                    borderColor: restrictToCourse === true ? "var(--primary)" : "var(--border)",
                    background: restrictToCourse === true ? "var(--primary-soft)" : "var(--card)",
                  }}
                >
                  <input
                    type="radio"
                    name="restrict"
                    checked={restrictToCourse === true}
                    onChange={() => setRestrictToCourse(true)}
                    className="mt-1"
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <div>
                    <div className="t-xs fw-6 fg">
                      เฉพาะนักศึกษาในรายวิชานี้ (แนะนำ)
                    </div>
                    <div className="t-xs muted" style={{ fontSize: "11px" }}>
                      ระบบจะตรวจสิทธิ์การลงทะเบียน ป้องกันคนนอกเข้าห้อง
                    </div>
                  </div>
                </label>

                <label
                  className="card card-p flex items-start gap-3 pointer transition"
                  style={{
                    padding: "12px 14px",
                    borderColor: restrictToCourse === false ? "var(--primary)" : "var(--border)",
                    background: restrictToCourse === false ? "var(--primary-soft)" : "var(--card)",
                  }}
                >
                  <input
                    type="radio"
                    name="restrict"
                    checked={restrictToCourse === false}
                    onChange={() => setRestrictToCourse(false)}
                    className="mt-1"
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <div>
                    <div className="t-xs fw-6 fg">
                      ทุกคนที่มี PIN
                    </div>
                    <div className="t-xs muted" style={{ fontSize: "11px" }}>
                      นักศึกษาที่ล็อกอินระบบทุกคนสามารถกรอก PIN เพื่อเข้าร่วมได้
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Error & 422 Problems */}
            {formError && (
              <div
                role="alert"
                className="p-3 rounded border mb-4 t-xs c-danger"
                style={{
                  background: "var(--danger-soft)",
                  borderColor: "rgba(187,58,74,.22)",
                }}
              >
                <div className="fw-6">{formError}</div>
                {problems.length > 0 && (
                  <ul className="mt-2 list-disc list-inside space-y-1" style={{ fontSize: "11px" }}>
                    {problems.map((prob, idx) => (
                      <li key={idx}>
                        ข้อที่ {prob.index + 1}: {prob.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Info Notice */}
            {infoNotice && (
              <div
                className="p-3 rounded border mb-4 t-xs fw-6 flex items-center gap-2"
                style={{
                  background: "var(--info-soft)",
                  borderColor: "var(--border)",
                  color: "var(--primary)",
                }}
              >
                <span
                  className="dot"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    background: "var(--primary)",
                  }}
                />
                <span>{infoNotice}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || quizzes.length === 0}
              className="btn btn-primary btn-block"
            >
              <Icon
                name={submitting ? "loader" : "play"}
                size={16}
                className={submitting ? "spin" : ""}
              />
              <span>{submitting ? "กำลังเปิดห้อง…" : "เปิดห้องควิซ (สร้าง PIN)"}</span>
            </button>
          </form>
        </div>

        {/* Rooms List (Right) */}
        <div className="lg:col-span-7 flex col gap-6">
          {/* Ongoing Rooms */}
          <div className="card card-p">
            <div className="flex items-center justify-between mb-4">
              <h2 className="t-md fw-7 fg">ห้องที่กำลังเปิดอยู่</h2>
              <span className="badge badge-success">
                <span className="dot" />
                {ongoingSessions.length} ห้อง
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 t-sm muted">กำลังโหลด…</div>
            ) : ongoingSessions.length === 0 ? (
              <div
                className="empty"
                style={{ padding: "32px 16px" }}
              >
                <div className="ec">
                  <Icon name="help" size={24} />
                </div>
                <div className="t-sm fw-6 fg">ไม่มีห้องที่กำลังเปิดใช้งานอยู่ในขณะนี้</div>
                <p className="t-xs muted" style={{ margin: 0 }}>
                  เปิดห้องควิซใหม่จากแบบฟอร์มด้านซ้ายเพื่อเริ่มการแข่งขัน
                </p>
              </div>
            ) : (
              <div className="flex col gap-3">
                {ongoingSessions.map((room) => (
                  <div
                    key={room.id}
                    className="card card-p flex wrap items-center justify-between gap-4"
                    style={{
                      padding: "16px",
                      background: "var(--muted)",
                      boxShadow: "none",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex-1" style={{ minWidth: 240 }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="t-base fw-7 fg">{room.title}</span>
                        <span className="badge badge-warning">
                          {room.phase}
                        </span>
                      </div>
                      <div className="flex wrap items-center gap-3 t-xs muted">
                        <span>
                          PIN:{" "}
                          <strong className="c-primary t-sm mono fw-7">
                            {room.pin}
                          </strong>
                        </span>
                        <span>จำนวน {room.total} ข้อ</span>
                        <span
                          className="badge badge-outline"
                          style={{ height: 20, padding: "0 6px", fontSize: 11 }}
                        >
                          {room.team_mode ? "โหมดทีม" : "โหมดเดี่ยว"}
                        </span>
                        <span>
                          {room.restrict_to_course
                            ? "จำกัดเฉพาะรายวิชา"
                            : "เปิดสาธารณะ"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/i/live/${room.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        <span>เข้าห้องควบคุม (Host)</span>
                        <Icon name="arrR" size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ended Rooms */}
          <div className="card card-p">
            <div className="flex items-center justify-between mb-4">
              <h2 className="t-md fw-7 fg">ประวัติห้องที่จบแล้ว</h2>
              <span className="t-xs muted">{endedSessions.length} รายการ</span>
            </div>

            {endedSessions.length === 0 ? (
              <div className="text-center py-6 t-xs muted">ยังไม่มีประวัติห้องควิซ</div>
            ) : (
              <div
                className="max-h-[360px] overflow-y-auto"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                {endedSessions.map((room) => (
                  <div
                    key={room.id}
                    className="py-3 flex items-center justify-between gap-4"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div>
                      <div className="t-sm fw-6 fg">{room.title}</div>
                      <div className="t-xs muted mt-0.5">
                        {new Date(room.created_at).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        · {room.total} ข้อ
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/i/live/${room.id}/results`}
                        className="btn btn-outline btn-sm"
                        style={{ minHeight: 32, height: 32, padding: "0 10px", fontSize: 12 }}
                      >
                        ดูผล
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstructorLivePage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8 text-center t-sm muted">
          กำลังโหลด…
        </div>
      }
    >
      <LiveRoomsContent />
    </Suspense>
  );
}
