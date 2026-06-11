"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { PageHead, Crumb } from "@/components/ui/Shared";
import { Avatar, Badge, statusBadge } from "@/components/ui/Primitives";
import Loading from "@/components/ui/Loading";

export default function StudentAssignments() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadData() {
      const { data: cData } = await supabase.from("courses").select("*");
      const { data: aData } = await supabase.from("assignments").select("*");
      const { data: lData } = await supabase.from("lessons").select("*");
      
      if (cData) setCourses(cData);
      if (aData) setAssignments(aData);
      if (lData) setLessons(lData);
      setLoading(false);
    }
    loadData();
  }, []);

  const nav = (path) => router.push(path);

  // 1. Process assignments and combine with course & status information
  const assignmentsList = assignments.map((asg) => {
    const course = courses.find((c) => c.id === asg.course_id);
    const lesson = lessons.find((l) => l.id === asg.lesson_id);
    
    // Status and score are loaded dynamically from student's progress in lessons
    const status = lesson?.assignment?.status || "not-submitted";
    const score = lesson?.assignment?.score || null;
    const total = lesson?.assignment?.total || asg.points;

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
        <div className="card card-p flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
            <Icon name="file" size={20} />
          </div>
          <div>
            <div className="t-xs muted">ใบงานทั้งหมด</div>
            <div className="t-xl fw-7 tnum">{totalCount} รายการ</div>
          </div>
        </div>

        <div className="card card-p flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--info-soft)", color: "var(--info)", display: "grid", placeItems: "center" }}>
            <Icon name="clock" size={20} />
          </div>
          <div>
            <div className="t-xs muted">ส่งแล้ว (รอตรวจ)</div>
            <div className="t-xl fw-7 tnum">{submittedCount} รายการ</div>
          </div>
        </div>

        <div className="card card-p flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--success-soft)", color: "var(--success)", display: "grid", placeItems: "center" }}>
            <Icon name="award" size={20} />
          </div>
          <div>
            <div className="t-xs muted">ตรวจแล้ว</div>
            <div className="t-xl fw-7 tnum">{gradedCount} รายการ</div>
          </div>
        </div>

        <div className="card card-p flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--warning-soft)", color: "var(--warning)", display: "grid", placeItems: "center" }}>
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

          <select
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
          </select>

          <select
            className="input"
            style={{ width: 150, height: 36 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="not-submitted">ยังไม่ส่ง</option>
            <option value="submitted">ส่งแล้ว</option>
            <option value="graded">ตรวจแล้ว</option>
          </select>
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
            
            return (
              <div
                key={asg.id}
                className="card pointer transition-all"
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  overflow: "hidden",
                  borderLeft: `5px solid ${asg.courseHero}`,
                }}
                onClick={() => nav(`/s/assignment/${asg.id}`)}
              >
                <div className="card-p flex items-center justify-between gap-4 flex-1" style={{ padding: "16px 20px" }}>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2 wrap mb-1">
                      <Badge tone="outline">{asg.courseCode}</Badge>
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
