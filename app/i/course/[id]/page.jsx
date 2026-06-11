"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, Avatar } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";

function StudentRoster({ students, courseSubmissions, enrolledScores, lessons }) {
  return (
    <div className="card">
      <div className="card-h flex items-center justify-between"><div className="title">รายชื่อนักศึกษา ({students.length})</div>
        <div className="flex gap-2"><div className="rel"><Icon name="search" size={15} style={{ position: "absolute", left: 10, top: 9, color: "var(--subtle)" }} /><input className="input btn-sm" style={{ paddingLeft: 32, width: 200, height: 34 }} placeholder="ค้นหา…" /></div></div>
      </div>
      <Table
        className="table"
        headers={[
          "รหัสนักศึกษา",
          "ชื่อ-นามสกุล",
          "Section",
          <span className="hide-m" key="progress">ความคืบหน้า</span>
        ]}
        data={students}
        colSpan={4}
        renderRow={(s) => {
          const studentId = s.id;
          const studentSubs = courseSubmissions.filter(sub => sub.student_id === studentId);
          const submittedCount = studentSubs.length;
          
          const studentScore = enrolledScores.find(ts => ts.student_id === studentId);
          const testCompleted = studentScore && studentScore.post !== null ? 1 : 0;
          
          const totalItems = lessons.filter(l => l.assignment).length + lessons.filter(l => l.posttest?.required).length;
          const progressVal = totalItems > 0 ? Math.round(((submittedCount + testCompleted) / totalItems) * 100) : 0;

          return (
            <tr key={s.id}>
              <td className="num">{s.student_no || "-"}</td>
              <td><div className="flex items-center gap-2"><Avatar name={s.name} size={28} />{s.name}</div></td>
              <td><Badge tone="outline">{s.section || "-"}</Badge></td>
              <td className="hide-m" style={{ width: 180 }}><div className="flex items-center gap-2"><Progress value={progressVal} h={6} /></div></td>
            </tr>
          );
        }}
      />
    </div>
  );
}

export default function InstructorCourse() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const courseId = params?.id;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [testScores, setTestScores] = useState([]);
  
  const [tab, setTab] = useState("lessons");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!courseId) return;
      const [cRes, lRes, sRes, subRes, tsRes, aRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("index", { ascending: true }),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("submissions").select("*"),
        supabase.from("test_scores").select("*"),
        supabase.from("assignments").select("id, lesson_id").eq("course_id", courseId)
      ]);
      
      if (cRes.data) setCourse(cRes.data);
      if (lRes.data) setLessons(lRes.data);
      if (sRes.data) setStudents(sRes.data);
      if (subRes.data) setSubmissions(subRes.data);
      if (tsRes.data) setTestScores(tsRes.data);
      if (aRes.data) setAssignments(aRes.data);
      
      setLoading(false);
    }
    load();
  }, [courseId]);

  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!course) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบข้อมูลรายวิชา</div>
            <div className="t-sm muted">ไม่พบข้อมูลรายวิชาตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของระบบ</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate enrolled students based on course section and access controls
  const courseSection = course.section;
  const allowedYears = course.access?.allowedYears || [];
  const allowedEmails = course.access?.allowedEmails || [];
  const enrolledStudents = students.filter(s => {
    if (courseSection && courseSection !== "ไม่ระบุ Section" && s.section !== courseSection) {
      return false;
    }
    if (allowedYears.length > 0) {
      const studentYear = s.student_no ? s.student_no.slice(0, 2) : "";
      if (!allowedYears.includes(studentYear) && !allowedEmails.includes(s.email)) {
        return false;
      }
    }
    return true;
  });

  const courseAssignmentIds = assignments.map(a => a.id);
  const courseSubmissions = submissions.filter(sub => courseAssignmentIds.includes(sub.assignment_id));
  const pendingSubmissionsCount = courseSubmissions.filter(sub => sub.status === "submitted").length;

  const enrolledStudentIds = enrolledStudents.map(s => s.id);
  const enrolledScores = testScores.filter(ts => enrolledStudentIds.includes(ts.student_id));
  const postScores = enrolledScores.map(ts => ts.post).filter(score => score !== null && score !== undefined);
  const avgPostTest = postScores.length > 0 ? (postScores.reduce((a, b) => a + b, 0) / postScores.length).toFixed(1) : "—";

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: course.code }]} />
      <PageHead kicker={course.term} title={course.title}
        right={<div className="flex gap-2"><button className="btn btn-outline"><Icon name="settings" size={16} />ตั้งค่า</button><button className="btn btn-primary" onClick={() => nav("/i/lesson/new?course_id=" + course.id)}><Icon name="plus" size={16} />เพิ่มบทเรียน</button></div>} />

      <div className="grid grid-4 gap-3 mb-5">
        {[
          ["บทเรียน", lessons.length, "book"], 
          ["นักศึกษา", enrolledStudents.length, "users"], 
          ["รอตรวจใบงาน", pendingSubmissionsCount, "file"], 
          ["คะแนนเฉลี่ย Post-test", avgPostTest, "chart"]
        ].map((s, i) => (
          <div key={i} className="card card-p flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name={s[2]} size={19} /></div>
            <div><div className="t-2xl fw-7 tnum" style={{ lineHeight: 1 }}>{s[1]}</div><div className="t-xs muted mt-1">{s[0]}</div></div>
          </div>
        ))}
      </div>

      <div className="tabs mb-4">
        {[["lessons", "บทเรียน", "book"], ["students", "นักศึกษา", "users"], ["settings", "ตั้งค่ารายวิชา", "settings"]].map(([k, t, ic]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
        ))}
      </div>

      {tab === "lessons" && (
        <div className="flex col gap-3">
          {lessons.map((l) => (
            <div key={l.id} className="card card-p flex items-center gap-3 pointer" style={{ padding: "14px 18px" }} onClick={() => nav("/i/lesson/" + l.id)}>
              <div className="iconbtn ghost" style={{ cursor: "grab" }}><Icon name="more" size={16} style={{ transform: "rotate(90deg)" }} /></div>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: "var(--muted)", display: "grid", placeItems: "center", fontWeight: 700, color: "var(--primary)", flex: "0 0 40px" }}>{String(l.index).padStart(2, "0")}</div>
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="fw-6">{l.title}</div>
                <div className="flex items-center gap-2 t-xs muted mt-1 wrap">
                  <span className="flex items-center gap-1"><Icon name="video" size={13} />{l.video ? "มีวิดีโอ" : "ไม่มีวิดีโอ"}</span><i className="dot-sep" />
                  <span className="flex items-center gap-1"><Icon name="clipboard" size={13} />Pre/Post-test</span><i className="dot-sep" />
                  <span className="flex items-center gap-1"><Icon name="file" size={13} />{l.assignment ? "1 ใบงาน" : "ไม่มีใบงาน"}</span>
                </div>
              </div>
              {l.assignment && (() => {
                const lessonAssignment = assignments.find(a => a.lesson_id === l.id);
                const pendingCount = lessonAssignment ? submissions.filter(sub => sub.assignment_id === lessonAssignment.id && sub.status === "submitted").length : 0;
                return pendingCount > 0 ? <Badge tone="warning" dot>{pendingCount} รอตรวจ</Badge> : null;
              })()}
              <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); nav("/i/lesson/" + l.id); }}><Icon name="pencil" size={14} />จัดการ</button>
            </div>
          ))}
          <button className="card card-p flex items-center justify-center gap-2 pointer muted" style={{ borderStyle: "dashed", background: "#fbfcfd" }} onClick={() => nav("/i/lesson/new?course_id=" + course.id)}>
            <Icon name="plus" size={17} />เพิ่มบทเรียนใหม่
          </button>
        </div>
      )}
      {tab === "students" && (
        <StudentRoster 
          students={enrolledStudents} 
          courseSubmissions={courseSubmissions} 
          enrolledScores={enrolledScores} 
          lessons={lessons} 
        />
      )}
      {tab === "settings" && <div className="card card-p"><div className="empty"><div className="ec"><Icon name="settings" size={22} /></div><div>ตั้งค่ารายวิชา — ชื่อ, รหัส, ภาคเรียน, สิทธิ์การเข้าถึง</div></div></div>}
    </div>
  );
}
