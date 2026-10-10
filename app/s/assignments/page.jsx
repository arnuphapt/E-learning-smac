"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isStaffRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { STUDENT_LESSON_COLUMNS } from "@/lib/files";
import Icon from "@/components/ui/Icon";
import { PageHead, Crumb } from "@/components/ui/Shared";
import { Avatar, Badge, statusBadge, Select } from "@/components/ui/Primitives";
import Loading from "@/components/ui/Loading";

function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
    return alpha != null ? `rgba(13, 110, 140, ${alpha})` : "#0d6e8c";
  }
  let c = hex.slice(1);
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(13, 110, 140, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function StudentAssignments() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const studentId = session?.dbId;
  const role = session?.user?.role;
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    async function loadData() {
      const queries = [
        supabase.from("courses").select("*"),
        supabase.from("assignments").select("*"),
        supabase.from("lessons").select(STUDENT_LESSON_COLUMNS)
      ];

      if (studentId) {
        queries.push(supabase.from("submissions").select("*").eq("student_id", studentId));
      }

      const results = await Promise.all(queries);
      if (cancelled) return;
      
      if (results[0].data) setCourses(results[0].data);
      if (results[1].data) setAssignments(results[1].data);
      if (results[2].data) setLessons(results[2].data);
      
      if (studentId && results[3]?.data) {
        setSubmissions(results[3].data);
      } else {
        setSubmissions([]);
      }
      
      setLoading(false);
    }
    loadData();
    return () => { cancelled = true; };
  }, [studentId, role, authStatus]);

  const nav = (path) => router.push(path);

  // 1. Process assignments and combine with course & status information
  const assignmentsList = assignments
    .filter((asg) => {
      const lesson = lessons.find((l) => l.id === asg.lesson_id);
      const isStaff = isStaffRole(role);
      // draft lessons are invisible to students (RLS), so a missing lesson is hidden too
      if ((!lesson || lesson.status === "draft") && !isStaff) return false;
      return true;
    })
    .map((asg) => {
      const course = courses.find((c) => c.id === asg.course_id);
      
      // Load real status, score, and total points from submissions table
      const sub = submissions.find((s) => s.assignment_id === asg.id);
      const status = sub ? sub.status : "not-submitted";
      const score = sub ? sub.score : null;
      const total = sub ? sub.total : asg.points;

      return {
        ...asg,
        status,
        score,
        total,
        courseCode: course?.code || "N/A",
        courseTitle: course?.title || "ไม่พบรายวิชา",
        courseHero: course?.hero || "var(--primary)",
      };
    });

  // 2. Filter logic
  const filteredAssignments = assignmentsList.filter((asg) => {
    const matchSearch =
      asg.title.toLowerCase().includes(search.toLowerCase()) ||
      asg.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      asg.courseTitle.toLowerCase().includes(search.toLowerCase());

    const matchCourse = courseFilter === "all" || asg.courseId === courseFilter;
    const matchStatus = statusFilter === "all" || asg.status === statusFilter;

    return matchSearch && matchCourse && matchStatus;
  });

  // 3. Stats for overview cards
  const totalCount = assignmentsList.length;
  const submittedCount = assignmentsList.filter((a) => a.status === "submitted").length;
  const gradedCount = assignmentsList.filter((a) => a.status === "graded").length;
  const pendingCount = assignmentsList.filter((a) => a.status === "not-submitted" || a.status === "late").length;

  if (loading) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <PageHead
        kicker="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        title="ใบงานของฉัน"
        desc="ติดตามสถานะใบงานที่มอบหมาย ส่งกระบวนการพยาบาล และดูคะแนนประเมินพร้อมข้อเสนอแนะจากอาจารย์"
      />

      {/* Stats Cards Section */}
      <div className="grid grid-4 gap-4 mb-5">
        <div className="card card-p flex items-center gap-3.5">
          <div className="clay-pod clay-pod-primary" style={{ width: 44, height: 44, borderRadius: 13 }}>
            <Icon name="file" size={20} />
          </div>
          <div>
            <div className="t-xs muted">ใบงานทั้งหมด</div>
            <div className="t-xl fw-7 tnum">{totalCount} รายการ</div>
          </div>
        </div>

        <div className="card card-p flex items-center gap-3.5">
          <div className="clay-pod clay-pod-info" style={{ width: 44, height: 44, borderRadius: 13 }}>
            <Icon name="clock" size={20} />
          </div>
          <div>
            <div className="t-xs muted">ส่งแล้ว (รอตรวจ)</div>
            <div className="t-xl fw-7 tnum">{submittedCount} รายการ</div>
          </div>
        </div>

        <div className="card card-p flex items-center gap-3.5">
          <div className="clay-pod clay-pod-success" style={{ width: 44, height: 44, borderRadius: 13 }}>
            <Icon name="award" size={20} />
          </div>
          <div>
            <div className="t-xs muted">ตรวจแล้ว</div>
            <div className="t-xl fw-7 tnum">{gradedCount} รายการ</div>
          </div>
        </div>

        <div className="card card-p flex items-center gap-3.5">
          <div className="clay-pod clay-pod-warning" style={{ width: 44, height: 44, borderRadius: 13 }}>
            <Icon name="alert" size={20} />
          </div>
          <div>
            <div className="t-xs muted">ยังไม่ส่ง / เกินกำหนด</div>
            <div className="t-xl fw-7 tnum">{pendingCount} รายการ</div>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex items-center justify-between gap-3 mb-4 wrap">
        <div className="flex items-center gap-2 flex-1" style={{ minWidth: 280 }}>
          <div className="rel flex-1" style={{ maxWidth: 320 }}>
            <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 10, color: "var(--subtle)" }} />
            <input
              className="input"
              style={{ paddingLeft: 34, height: 36, width: "100%" }}
              placeholder="ค้นหาชื่อใบงาน หรือรหัสวิชา…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            className="input"
            style={{ width: 180, height: 36 }}
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">ทุกรายวิชา</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </Select>

          <Select
            className="input"
            style={{ width: 150, height: 36 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="not-submitted">ยังไม่ส่ง</option>
            <option value="submitted">ส่งแล้ว</option>
            <option value="graded">ตรวจแล้ว</option>
          </Select>
        </div>

        <span className="t-sm muted">{filteredAssignments.length} ใบงาน</span>
      </div>

      {/* Assignments list */}
      <div className="flex col gap-3">
        {filteredAssignments.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="ec">
                <Icon name="file" size={24} />
              </div>
              <div>
                <div className="fw-6 fg">ไม่พบใบงานตามเงื่อนไขที่เลือก</div>
                <div className="t-sm mt-1">ลองเปลี่ยนตัวกรอง หรือค้นหาคำอื่น</div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSearch("");
                  setCourseFilter("all");
                  setStatusFilter("all");
                }}
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          </div>
        ) : (
          filteredAssignments.map((asg) => {
            const isDueSoon = !["submitted", "graded"].includes(asg.status);
            const hero = asg.courseHero && asg.courseHero.startsWith("#") ? asg.courseHero : "#0d6e8c";
            
            return (
              <div
                key={asg.id}
                className="card pointer transition-all"
                style={{
                  display: "flex",
                  alignItems: "stretch",
                }}
                onClick={() => nav(`/s/assignment/${asg.id}`)}
              >
                <div className="card-p flex items-center justify-between gap-4 flex-1" style={{ padding: "18px 22px" }}>
                  <div className="flex items-center flex-1" style={{ minWidth: 0, gap: 16 }}>
                    <div
                      className="clay-pod"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${hexToRgba(hero, 0.16)} 0%, ${hexToRgba(hero, 0.07)} 100%)`,
                        border: `1.5px solid ${hexToRgba(hero, 0.28)}`,
                        color: hero,
                        boxShadow: `inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.95), inset -1.5px -1.5px 3px ${hexToRgba(hero, 0.18)}, 0 4px 10px -2px ${hexToRgba(hero, 0.2)}`,
                      }}
                    >
                      <Icon name="clipboard" size={22} />
                    </div>

                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="flex items-center wrap mb-1.5" style={{ gap: 10 }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: "11px",
                            fontWeight: 700,
                            background: hexToRgba(hero, 0.12),
                            color: hero,
                            border: `1px solid ${hexToRgba(hero, 0.25)}`,
                            boxShadow: "inset 1px 1px 2px rgba(255,255,255,.9)",
                          }}
                        >
                          {asg.courseCode}
                        </span>
                        <span className="t-xs muted">{asg.courseTitle}</span>
                      </div>
                      <div className="fw-7 t-base pretty mb-2" style={{ color: "var(--fg)" }}>{asg.title}</div>
                      
                      <div className="flex items-center gap-3 t-xs muted wrap">
                        <span className="flex items-center gap-1">
                          <Icon name="cal" size={13} />
                          กำหนดส่ง: <span className={isDueSoon ? "c-warning fw-6" : ""}>{asg.due}</span>
                        </span>
                        <i className="dot-sep" />
                        <span className="flex items-center gap-1">
                          <Icon name="star" size={13} />
                          คะแนนเต็ม: {asg.points} คะแนน
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-0">
                    {asg.status === "graded" && (
                      <div className="hide-m text-right">
                        <div className="t-xs muted">คะแนนที่ได้</div>
                        <div className="t-lg fw-7 c-success tnum">
                          {asg.score}
                          <span className="t-xs fw-5 muted">/{asg.total}</span>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ width: 100, textAlign: "right" }}>
                      {statusBadge(asg.status)}
                    </div>
                    
                    <span className="btn btn-soft btn-sm flex-0">
                      {asg.status === "graded" ? "ดูผลคะแนน" : asg.status === "submitted" ? "ตรวจสอบงาน" : "ส่งงาน"}
                      <Icon name="arrR" size={15} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
