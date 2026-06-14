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
import { useSession } from "next-auth/react";

function MultiSelect({ options, selectedValues, onChange, placeholder = "เลือก..." }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.filter(o => selectedValues.includes(o.id));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setIsOpen(!isOpen)} className="input"
        style={{ cursor: "pointer", minHeight: 40, height: "auto", padding: "6px 12px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {selected.length === 0 ? <span className="muted t-sm">{placeholder}</span> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
            {selected.map(o => (
              <span key={o.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 600 }}>
                {o.name}
                <span onClick={e => { e.stopPropagation(); onChange(selectedValues.filter(id => id !== o.id)); }} style={{ cursor: "pointer", fontWeight: "bold", fontSize: 12 }}>✕</span>
              </span>
            ))}
          </div>
        )}
        <Icon name="chevD" size={15} className="muted" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: ".15s", marginLeft: "auto", flexShrink: 0 }} />
      </div>
      {isOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface, #fff)", border: "1px solid var(--border-strong)", borderRadius: 8, boxShadow: "0 10px 24px rgba(0,0,0,0.1)", marginTop: 4, maxHeight: 220, overflowY: "auto", padding: 6 }}>
          {options.length === 0 ? <div className="t-xs muted text-center p-3">ไม่มีข้อมูล</div> : options.map(u => {
            const isSel = selectedValues.includes(u.id);
            return (
              <div key={u.id} onClick={() => onChange(isSel ? selectedValues.filter(id => id !== u.id) : [...selectedValues, u.id])}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, cursor: "pointer", background: isSel ? "var(--primary-soft)" : "transparent", color: isSel ? "var(--primary)" : "var(--fg)", marginBottom: 2, userSelect: "none" }}>
                <input type="checkbox" checked={isSel} onChange={() => {}} style={{ pointerEvents: "none" }} />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span className="t-sm fw-6">{u.name}</span>
                  <span className="t-xs muted">{u.email}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const { data: session } = useSession();
  const user = session?.user;

  const courseId = params?.id;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [testScores, setTestScores] = useState([]);
  const [courseInstructors, setCourseInstructors] = useState([]);
  const [availableInstructors, setAvailableInstructors] = useState([]);
  const [allInstructors, setAllInstructors] = useState([]);
  const [editMainManagers, setEditMainManagers] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  
  const [tab, setTab] = useState("lessons");
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editYearLevels, setEditYearLevels] = useState([]);
  const [savingTitle, setSavingTitle] = useState(false);

  const loadData = async () => {
    if (!courseId || !user) return;
    const [cRes, lRes, sRes, subRes, tsRes, aRes, ciRes, insRes] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).single(),
      supabase.from("lessons").select("*").eq("course_id", courseId).order("index", { ascending: true }),
      supabase.from("users").select("*").eq("role", "student"),
      supabase.from("submissions").select("*"),
      supabase.from("test_scores").select("*"),
      supabase.from("assignments").select("id, lesson_id").eq("course_id", courseId),
      supabase.from("course_instructors").select("user_id").eq("course_id", courseId),
      supabase.from("users").select("id, name, email, role, group_id").or("role.like.%instructor%,role.like.%course_manager%,role.like.%admin%")
    ]);
    
    if (cRes.data) {
      const c = cRes.data;
      const instructorsList = ciRes?.data || [];
      const isInstructorAssigned = instructorsList.some(i => i.user_id === user?.id);

      // Security check:
      // 1. Admin has access to everything
      // 2. Course manager has access to courses in their group/department OR assigned to them
      // 3. Instructor has access to courses assigned to them
      let hasAccess = false;
      if (user?.role === "admin") {
        hasAccess = true;
      } else if (user?.role === "course_manager") {
        hasAccess = c.group_id === user.group_id || user.group_ids?.includes(c.group_id) || isInstructorAssigned;
      } else if (user?.role === "instructor") {
        hasAccess = isInstructorAssigned;
      }

      if (!hasAccess) {
        toast("คุณไม่มีสิทธิ์เข้าถึงหรือจัดการรายวิชานี้", "error");
        nav("/i/courses");
        return;
      }

      setCourse(c);
      setEditTitle(c.title);
      setEditYearLevels(c.year_level || []);

      const allInstructorsInDb = insRes.data || [];
      setAllInstructors(allInstructorsInDb);

      const assignedIds = instructorsList.map(ci => ci.user_id);
      
      // Find matching user for c.instructor name
      const matchingUser = allInstructorsInDb.find(u => u.name === c.instructor);
      if (matchingUser) {
        setEditMainManagers([matchingUser.id]);
      } else {
        const groupCM = allInstructorsInDb.find(u => u.group_id === c.group_id && u.role === "course_manager");
        setEditMainManagers(groupCM ? [groupCM.id] : []);
      }

      const mainManagerIds = matchingUser ? [matchingUser.id] : [];

      // Exclude Main Manager from Assigned Instructors
      const assigned = allInstructorsInDb.filter(inst =>
        assignedIds.includes(inst.id) &&
        !mainManagerIds.includes(inst.id)
      );
      setCourseInstructors(assigned);

      // Exclude Main Manager from Available Instructors
      const available = allInstructorsInDb.filter(inst =>
        !assignedIds.includes(inst.id) &&
        !mainManagerIds.includes(inst.id) &&
        inst.role?.split(",").map(r => r.trim()).includes("instructor")
      );
      setAvailableInstructors(available);
    }
    if (lRes.data) setLessons(lRes.data);
    if (sRes.data) setStudents(sRes.data);
    if (subRes.data) setSubmissions(subRes.data);
    if (tsRes.data) setTestScores(tsRes.data);
    if (aRes.data) setAssignments(aRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [courseId, user]);

  const handleAddInstructor = async (userIds) => {
    if (!userIds || userIds.length === 0) return;
    try {
      const rows = userIds.map(uid => ({ course_id: courseId, user_id: uid }));
      const { error } = await supabase.from("course_instructors").insert(rows);
      if (error) throw error;
      toast("เพิ่มอาจารย์ผู้สอนร่วมเรียบร้อยแล้ว");
      loadData();
    } catch (error) {
      toast("เกิดข้อผิดพลาด: " + error.message, "error");
    }
  };

  const handleRemoveInstructor = async (userId) => {
    const confirmed = await confirm({
      title: "ยกเลิกสิทธิ์เข้าสอน",
      message: "คุณต้องการถอดถอนอาจารย์ท่านนี้ออกจากรายวิชาใช่หรือไม่? อาจารย์ท่านนี้จะไม่สามารถเข้าจัดการวิชานี้ได้อีกต่อไป",
      danger: true,
      confirmText: "ถอดถอน",
      cancelText: "ยกเลิก"
    });
    
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from("course_instructors")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", userId);
        
      if (error) throw error;
      toast("ถอดถอนอาจารย์ผู้สอนร่วมเรียบร้อยแล้ว");
      loadData();
    } catch (error) {
      toast("เกิดข้อผิดพลาด: " + error.message, "error");
    }
  };

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
      const managerNames = editMainManagers
        .map(id => allInstructors.find(u => u.id === id)?.name)
        .filter(Boolean);
      const managerName = managerNames.length > 0 ? managerNames.join(", ") : course.instructor;

      const { error } = await supabase
        .from("courses")
        .update({
          title: editTitle,
          year_level: editYearLevels,
          instructor: managerName
        })
        .eq("id", course.id);

      if (error) throw error;

      // Ensure all main managers are in course_instructors
      for (const mgId of editMainManagers) {
        const { data: existing } = await supabase
          .from("course_instructors")
          .select("user_id")
          .eq("course_id", course.id)
          .eq("user_id", mgId);
        if (!existing || existing.length === 0) {
          await supabase.from("course_instructors").insert({ course_id: course.id, user_id: mgId });
        }
      }

      setCourse({ 
        ...course, 
        title: editTitle, 
        year_level: editYearLevels,
        instructor: managerName 
      });
      toast("บันทึกข้อมูลรายวิชาเรียบร้อยแล้ว");
      loadData();
    } catch (error) {
      console.error("Error updating course:", error);
      toast("เกิดข้อผิดพลาดในการบันทึกข้อมูลรายวิชา: " + error.message, "error");
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
        right={
          <div className="flex gap-2">
            {(user?.role === "admin" || user?.role === "course_manager") && (
              <button className="btn btn-outline" onClick={() => setTab("settings")}>
                <Icon name="settings" size={16} />ตั้งค่า
              </button>
            )}
            <button className="btn btn-primary" onClick={() => nav("/i/lesson/new?course_id=" + course.id)}>
              <Icon name="plus" size={16} />เพิ่มบทเรียน
            </button>
          </div>
        } 
      />

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
        {[
          ["lessons", "บทเรียน", "book"], 
          ["students", "นักศึกษา", "users"], 
          ...(user?.role === "admin" || user?.role === "course_manager" ? [["settings", "ตั้งค่ารายวิชา", "settings"]] : [])
        ].map(([k, t, ic]) => (
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
            
            <div className="field mb-3">
              <label className="label">ชื่อรายวิชา</label>
              <input 
                className="input" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                placeholder="เช่น การพยาบาลผู้ใหญ่ 1" 
              />
            </div>

            {/* อาจารย์ผู้รับผิดชอบหลัก */}
            <div className="field mb-3">
              <label className="label">อาจารย์ผู้รับผิดชอบหลัก <span className="c-danger">*</span></label>
              <MultiSelect
                options={allInstructors}
                selectedValues={editMainManagers}
                onChange={setEditMainManagers}
                placeholder="เลือกอาจารย์ผู้รับผิดชอบหลัก..."
              />
            </div>

            {/* Year Level Access */}
            <div className="field mb-4">
              <label className="label">ชั้นปีที่เข้าถึงได้ <span className="t-xs muted fw-4">(ไม่เลือก = ทุกชั้นปี)</span></label>
              <div className="flex items-center gap-3 flex-wrap" style={{ paddingTop: 6 }}>
                {[1, 2, 3, 4].map((yr) => {
                  const checked = editYearLevels.includes(yr);
                  return (
                    <label key={yr} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none",
                      padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                      background: checked ? "var(--primary-soft, #eef6ff)" : "var(--surface)", transition: ".15s", fontWeight: checked ? 700 : 400,
                      color: checked ? "var(--primary)" : "var(--fg)" }}>
                      <input type="checkbox" style={{ display: "none" }} checked={checked}
                        onChange={() => setEditYearLevels(prev => checked ? prev.filter(y => y !== yr) : [...prev, yr].sort())} />
                      <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${checked ? "var(--primary)" : "var(--border-strong)"}`,
                        background: checked ? "var(--primary)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      ชั้นปี {yr}
                    </label>
                  );
                })}
              </div>
              {editYearLevels.length === 0 && (
                <div className="t-xs muted mt-2" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M10 9v5M10 7v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  นักศึกษาทุกชั้นปีจะมองเห็นรายวิชานี้
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button 
                className={`btn btn-primary ${savingTitle ? "disabled" : ""}`} 
                onClick={handleUpdateCourse} 
                disabled={savingTitle || (
                  editTitle === course.title && 
                  JSON.stringify(editYearLevels) === JSON.stringify(course.year_level || []) &&
                  JSON.stringify(editMainManagers) === JSON.stringify(allInstructors.filter(u => course.instructor?.split(", ").includes(u.name)).map(u => u.id))
                )}
              >
                <Icon name={savingTitle ? "loader" : "check"} size={15} className={savingTitle ? "spin" : ""} />
                {savingTitle ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>

          {/* Managing Instructors section: only for admins and course managers */}
          {(user?.role === "admin" || user?.role === "course_manager") && (
            <div className="card card-p">
              <div className="t-base fw-7 mb-2">จัดการอาจารย์ผู้สอนร่วม (Instructors)</div>
              <p className="t-sm muted mb-3">มอบหมายสิทธิ์ให้อาจารย์ผู้สอนท่านอื่นในสาขาเดียวกัน เพื่อให้สามารถเข้ามาเพิ่มบทเรียน ตรวจงาน และจัดการวิชานี้ได้</p>
              
              {/* Assigned instructors list */}
              <div className="flex col gap-2 mb-4">
                <div className="t-xs fw-7 muted">อาจารย์ที่ได้รับสิทธิ์ในวิชานี้:</div>
                {courseInstructors.length === 0 ? (
                  <div className="t-sm muted p-3 border rounded text-center" style={{ borderStyle: "dashed", background: "var(--bg)" }}>ยังไม่มีอาจารย์ผู้สอนร่วมในรายวิชานี้</div>
                ) : (
                  courseInstructors.map(inst => (
                    <div key={inst.id} className="flex items-center justify-between p-2 border rounded bg-muted" style={{ background: "var(--muted)" }}>
                      <div className="flex items-center gap-2">
                        <Avatar name={inst.name.replace(/^อ\. (ดร\. )?/, "")} size={24} />
                        <div>
                          <div className="fw-6 t-sm">{inst.name}</div>
                          <div className="t-xs muted">{inst.email}</div>
                        </div>
                      </div>
                      {inst.id !== user?.id && (
                        <button 
                          className="iconbtn ghost c-danger" 
                          onClick={() => handleRemoveInstructor(inst.id)}
                          style={{ height: 28, width: 28 }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add instructor multiselect form */}
              {availableInstructors.length > 0 ? (
                <div className="flex gap-2" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <MultiSelect
                      options={availableInstructors}
                      selectedValues={selectedToAdd}
                      onChange={setSelectedToAdd}
                      placeholder="เลือกอาจารย์เพื่อเพิ่มเข้าสู่รายวิชา..."
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={selectedToAdd.length === 0}
                    onClick={() => { handleAddInstructor(selectedToAdd); setSelectedToAdd([]); }}
                  >
                    <Icon name="plus" size={14} /> เพิ่มผู้สอน
                  </button>
                </div>
              ) : (
                <div className="t-xs muted">ไม่มีอาจารย์ผู้สอนท่านอื่นที่ว่างในสาขาวิชานี้</div>
              )}
            </div>
          )}

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
