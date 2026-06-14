"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, Avatar } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";

function StudentRoster({ students, courseSubmissions, enrolledScores, lessons, assignments }) {
  return (
    <Table
      title={`รายชื่อนักศึกษา (${students.length})`}
      className="table"
      searchPlaceholder="ค้นหาชื่อ หรือรหัสนักศึกษา..."
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
        
        const totalAssignments = assignments.length;
        
        let progressPct = 0;
        if (totalAssignments > 0) {
          progressPct = (submittedCount / totalAssignments) * 100;
        }

        return (
          <tr key={s.id}>
            <td className="num">{s.student_no}</td>
            <td className="fw-6">{s.name}</td>
            <td>{s.section || "-"}</td>
            <td className="hide-m">
              <div className="flex items-center gap-3">
                <Progress value={progressPct} />
                <span className="muted t-xs">{submittedCount}/{totalAssignments}</span>
              </div>
            </td>
          </tr>
        );
      }}
    />
  );
}

export default function InstructorCourse() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);
  const confirm = useConfirm();

  const courseId = params?.id;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [testScores, setTestScores] = useState([]);
  
  const [tab, setTab] = useState("lessons");
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const loadData = async () => {
    if (!courseId) return;
    const [cRes, lRes, sRes, subRes, tsRes, aRes] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).single(),
      supabase.from("lessons").select("*").eq("course_id", courseId).order("index", { ascending: true }),
      supabase.from("users").select("*").eq("role", "student"),
      supabase.from("submissions").select("*"),
      supabase.from("test_scores").select("*"),
      supabase.from("assignments").select("id, lesson_id").eq("course_id", courseId)
    ]);
    
    if (cRes.data) {
      setCourse(cRes.data);
      setEditTitle(cRes.data.title);
    }
    if (lRes.data) setLessons(lRes.data);
    if (sRes.data) setStudents(sRes.data);
    if (subRes.data) setSubmissions(subRes.data);
    if (tsRes.data) setTestScores(tsRes.data);
    if (aRes.data) setAssignments(aRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const handleDeleteLesson = async (lId, lTitle) => {
    const confirmed = await confirm({
      title: "ลบบทเรียน",
      message: `คุณต้องการลบบทเรียน "${lTitle}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`,
      danger: true,
      confirmText: "ลบบทเรียน",
      cancelText: "ยกเลิก"
    });

    if (!confirmed) {
      return;
    }

    try {
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("lesson_id", lId);
      const assignmentIds = assignments?.map((a) => a.id) || [];
      const rubricIds = assignments?.map((a) => a.rubric_id).filter(Boolean) || [];

      if (assignmentIds.length > 0) {
        const { error: subErr } = await supabase.from("submissions").delete().in("assignment_id", assignmentIds);
        if (subErr) throw subErr;
      }

      if (assignmentIds.length > 0) {
        const { error: asgErr } = await supabase.from("assignments").delete().in("id", assignmentIds);
        if (asgErr) throw asgErr;
      }

      if (rubricIds.length > 0) {
        const { error: rubErr } = await supabase.from("rubrics").delete().in("id", rubricIds);
        if (rubErr) throw rubErr;
      }

      const { error: qErr } = await supabase.from("questions").delete().eq("lesson_id", lId);
      if (qErr) throw qErr;

      const { error: lesErr } = await supabase.from("lessons").delete().eq("id", lId);
      if (lesErr) throw lesErr;

      toast("ลบบทเรียนเรียบร้อยแล้ว");
      loadData();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast("เกิดข้อผิดพลาดในการลบบทเรียน: " + error.message, "error");
    }
  };

  const handleUpdateCourse = async () => {
    if (!editTitle) return toast("กรุณากรอกชื่อรายวิชา", "warning");
    setSavingTitle(true);
    try {
      const { error } = await supabase.from("courses").update({ title: editTitle }).eq("id", course.id);
      if (error) throw error;
      setCourse({ ...course, title: editTitle });
      toast("บันทึกชื่อรายวิชาเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error updating course:", error);
      toast("เกิดข้อผิดพลาดในการบันทึกชื่อรายวิชา: " + error.message, "error");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDeleteCourse = async () => {
    const confirmed = await confirm({
      title: "ลบรายวิชา",
      message: `คุณต้องการลบรายวิชา "${course.title} (${course.code})" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบบทเรียน, ข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของรายวิชานี้อย่างถาวรและไม่สามารถกู้คืนได้!`,
      danger: true,
      confirmText: "ลบรายวิชา",
      cancelText: "ยกเลิก"
    });

    if (!confirmed) {
      return;
    }

    try {
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("course_id", course.id);
      const assignmentIds = assignments?.map((a) => a.id) || [];
      const rubricIds = assignments?.map((a) => a.rubric_id).filter(Boolean) || [];

      const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", course.id);
      const lessonIds = lessons?.map((l) => l.id) || [];

      if (assignmentIds.length > 0) {
        const { error: subErr } = await supabase.from("submissions").delete().in("assignment_id", assignmentIds);
        if (subErr) throw subErr;
      }

      if (assignmentIds.length > 0) {
        const { error: asgErr } = await supabase.from("assignments").delete().in("id", assignmentIds);
        if (asgErr) throw asgErr;
      }

      if (rubricIds.length > 0) {
        const { error: rubErr } = await supabase.from("rubrics").delete().in("id", rubricIds);
        if (rubErr) throw rubErr;
      }

      if (lessonIds.length > 0) {
        const { error: qErr } = await supabase.from("questions").delete().in("lesson_id", lessonIds);
        if (qErr) throw qErr;
      }

      if (lessonIds.length > 0) {
        const { error: lesErr } = await supabase.from("lessons").delete().in("id", lessonIds);
        if (lesErr) throw lesErr;
      }

      const { error: cErr } = await supabase.from("courses").delete().eq("id", course.id);
      if (cErr) throw cErr;

      toast("ลบรายวิชาเรียบร้อยแล้ว");
      nav("/i/courses");
    } catch (error) {
      console.error("Error deleting course:", error);
      toast("เกิดข้อผิดพลาดในการลบรายวิชา: " + error.message, "error");
    }
  };

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
        right={<div className="flex gap-2"><button className="btn btn-outline" onClick={() => setTab("settings")}><Icon name="settings" size={16} />ตั้งค่า</button><button className="btn btn-primary" onClick={() => nav("/i/lesson/new?course_id=" + course.id)}><Icon name="plus" size={16} />เพิ่มบทเรียน</button></div>} />

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
                  <span className="flex items-center gap-1"><Icon name="file" size={13} />{
                    (() => {
                      const count = assignments.filter(a => a.lesson_id === l.id).length;
                      return count > 0 ? `${count} ใบงาน` : "ไม่มีใบงาน";
                    })()
                  }</span>
                </div>
              </div>
              {(() => {
                const lessonAsgIds = assignments.filter(a => a.lesson_id === l.id).map(a => a.id);
                const pendingCount = submissions.filter(sub => lessonAsgIds.includes(sub.assignment_id) && sub.status === "submitted").length;
                return pendingCount > 0 ? <Badge tone="warning" dot>{pendingCount} รอตรวจ</Badge> : null;
              })()}
              <div className="flex items-center gap-2">
                <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); nav("/i/lesson/" + l.id); }} style={{ height: 32, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="pencil" size={14} />จัดการ</button>
                <button className="iconbtn ghost c-danger" onClick={(e) => { e.stopPropagation(); handleDeleteLesson(l.id, l.title); }} style={{ height: 32, width: 32 }}><Icon name="trash" size={15} /></button>
              </div>
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
          assignments={assignments}
        />
      )}
      {tab === "settings" && (
        <div className="flex col gap-4">
          <div className="card card-p">
            <div className="t-base fw-7 mb-3">แก้ไขข้อมูลรายวิชา</div>
            <div className="field">
              <label className="label">ชื่อรายวิชา</label>
              <div className="flex gap-2">
                <input 
                  className="input flex-1" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  placeholder="เช่น สังคมศึกษา พื้นฐาน" 
                />
                <button 
                  className={`btn btn-primary ${savingTitle ? "disabled" : ""}`} 
                  onClick={handleUpdateCourse} 
                  disabled={savingTitle || editTitle === course.title}
                >
                  <Icon name={savingTitle ? "loader" : "check"} size={15} className={savingTitle ? "spin" : ""} />
                  {savingTitle ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>

          <div className="card card-p">
            <div className="t-base fw-7 c-danger mb-2">พื้นที่อันตราย (Danger Zone)</div>
            <p className="t-sm muted mb-4">การลบรายวิชานี้จะทำให้บทเรียน ข้อสอบ ใบงาน และรายการส่งงานทั้งหมดของรายวิชาถูกลบอย่างถาวรและไม่สามารถกู้คืนได้</p>
            <button className="btn btn-outline c-danger" onClick={handleDeleteCourse}>
              <Icon name="trash" size={15} /> ลบรายวิชานี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
