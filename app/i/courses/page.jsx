"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";

export default function InstructorCourses() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState({});

  const load = async () => {
    setLoading(true);
    const [cRes, lRes, sRes, aRes, subRes] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("lessons").select("id, course_id, title, index, status").order("index", { ascending: true }),
      supabase.from("users").select("id, student_no, section, email").eq("role", "student"),
      supabase.from("assignments").select("id, course_id"),
      supabase.from("submissions").select("id, assignment_id, status")
    ]);

    if (cRes.data) {
      const coursesList = cRes.data;
      const allLessons = lRes.data || [];
      const allStudents = sRes.data || [];
      const allAssignments = aRes.data || [];
      const allSubmissions = subRes.data || [];

      const enrichedCourses = coursesList.map((c) => {
        const courseLessons = allLessons.filter((l) => l.course_id === c.id);

        const courseSection = c.section;
        const allowedYears = c.access?.allowedYears || [];
        const allowedEmails = c.access?.allowedEmails || [];
        const enrolledStudents = allStudents.filter((s) => {
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

        const courseAssignmentIds = allAssignments
          .filter((a) => a.course_id === c.id)
          .map((a) => a.id);
        const pendingGradingCount = allSubmissions.filter(
          (sub) => courseAssignmentIds.includes(sub.assignment_id) && sub.status === "submitted"
        ).length;

        return {
          ...c,
          lessons: courseLessons,
          lessonsCount: courseLessons.length,
          studentsCount: enrolledStudents.length,
          pendingGradingCount: pendingGradingCount
        };
      });

      setCourses(enrichedCourses);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleExpand = (courseId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const handleDeleteCourse = async (c) => {
    if (
      !confirm(
        `คุณต้องการลบรายวิชา "${c.title} (${c.code})" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบบทเรียน, ข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของรายวิชานี้อย่างถาวรและไม่สามารถกู้คืนได้!`
      )
    ) {
      return;
    }

    try {
      // 1. Get assignments
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("course_id", c.id);
      const assignmentIds = assignments?.map((a) => a.id) || [];
      const rubricIds = assignments?.map((a) => a.rubric_id).filter(Boolean) || [];

      // 2. Get lessons
      const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", c.id);
      const lessonIds = lessons?.map((l) => l.id) || [];

      // 3. Delete submissions
      if (assignmentIds.length > 0) {
        const { error: subErr } = await supabase.from("submissions").delete().in("assignment_id", assignmentIds);
        if (subErr) throw subErr;
      }

      // 4. Delete assignments
      if (assignmentIds.length > 0) {
        const { error: asgErr } = await supabase.from("assignments").delete().in("id", assignmentIds);
        if (asgErr) throw asgErr;
      }

      // 5. Delete rubrics
      if (rubricIds.length > 0) {
        const { error: rubErr } = await supabase.from("rubrics").delete().in("id", rubricIds);
        if (rubErr) throw rubErr;
      }

      // 6. Delete questions
      if (lessonIds.length > 0) {
        const { error: qErr } = await supabase.from("questions").delete().in("lesson_id", lessonIds);
        if (qErr) throw qErr;
      }

      // 7. Delete lessons
      if (lessonIds.length > 0) {
        const { error: lesErr } = await supabase.from("lessons").delete().in("id", lessonIds);
        if (lesErr) throw lesErr;
      }

      // 8. Delete course
      const { error: cErr } = await supabase.from("courses").delete().eq("id", c.id);
      if (cErr) throw cErr;

      alert("ลบรายวิชาเรียบร้อยแล้ว");
      load();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("เกิดข้อผิดพลาดในการลบรายวิชา: " + error.message);
    }
  };

  const handleDeleteLesson = async (l, courseId) => {
    if (
      !confirm(
        `คุณต้องการลบบทเรียน "บทที่ ${l.index}: ${l.title}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`
      )
    ) {
      return;
    }

    try {
      // 1. Get assignments
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("lesson_id", l.id);
      const assignmentIds = assignments?.map((a) => a.id) || [];
      const rubricIds = assignments?.map((a) => a.rubric_id).filter(Boolean) || [];

      // 2. Delete submissions
      if (assignmentIds.length > 0) {
        const { error: subErr } = await supabase.from("submissions").delete().in("assignment_id", assignmentIds);
        if (subErr) throw subErr;
      }

      // 3. Delete assignments
      if (assignmentIds.length > 0) {
        const { error: asgErr } = await supabase.from("assignments").delete().in("id", assignmentIds);
        if (asgErr) throw asgErr;
      }

      // 4. Delete rubrics
      if (rubricIds.length > 0) {
        const { error: rubErr } = await supabase.from("rubrics").delete().in("id", rubricIds);
        if (rubErr) throw rubErr;
      }

      // 5. Delete questions
      const { error: qErr } = await supabase.from("questions").delete().eq("lesson_id", l.id);
      if (qErr) throw qErr;

      // 6. Delete lesson
      const { error: lesErr } = await supabase.from("lessons").delete().eq("id", l.id);
      if (lesErr) throw lesErr;

      alert("ลบบทเรียนเรียบร้อยแล้ว");
      load();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("เกิดข้อผิดพลาดในการลบบทเรียน: " + error.message);
    }
  };

  return (
    <div className="container">
      <PageHead kicker="พื้นที่อาจารย์ผู้สอน" title="จัดการรายวิชา"
        desc="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ" />

      <Table
        title="รายวิชาทั้งหมด"
        description="รายชื่อวิชาในกลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        addButton={
          <button className="btn btn-primary btn-sm" onClick={() => nav("/i/course/new")}>
            <Icon name="plus" size={15} />สร้างรายวิชา
          </button>
        }
        loading={loading}
        className="table hover"
            headers={[
              "",
              "รายวิชา", 
              <span className="hide-m" key="term">ภาคเรียน</span>, 
              "บทเรียน", 
              "นักศึกษา", 
              <span className="hide-m" key="needsGrading">รอตรวจ</span>, 
              "การจัดการ"
            ]}
            colSpan={7}
            data={courses}
            renderRow={(c, i) => (
              <React.Fragment key={c.id}>
                <tr onClick={() => toggleExpand(c.id)} style={{ cursor: "pointer" }}>
                  <td style={{ width: 40, paddingLeft: 16 }}>
                    <div style={{ display: "grid", placeItems: "center" }}>
                      <Icon 
                        name="chevD" 
                        size={17} 
                        style={{ 
                          color: "var(--subtle)", 
                          transform: expandedCourses[c.id] ? "rotate(180deg)" : "none", 
                          transition: "transform 0.2s" 
                        }} 
                      />
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: c.hero || "var(--primary)", color: "#fff", display: "grid", placeItems: "center", flex: "0 0 38px", fontWeight: 700, fontSize: 12 }}>{c.code.slice(-3)}</div>
                      <div><div className="fw-6">{c.title}</div><div className="t-xs muted">{c.code} · {c.subtitle?.slice(0, 28) || ""}…</div></div>
                    </div>
                  </td>
                  <td className="hide-m muted">{c.term}</td>
                  <td className="num">{c.lessonsCount}</td>
                  <td className="num">{c.studentsCount}</td>
                  <td className="hide-m">
                    {c.pendingGradingCount > 0 ? (
                      <Badge tone="warning" dot>{c.pendingGradingCount} ชิ้น</Badge>
                    ) : (
                      <span className="muted t-sm">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-outline btn-sm" onClick={() => nav("/i/course/" + c.id)} style={{ display: "flex", alignItems: "center", gap: 4, height: 32 }}>
                        <Icon name="pencil" size={13} /> จัดการรายวิชา
                      </button>
                      <button className="iconbtn ghost c-danger" onClick={() => handleDeleteCourse(c)} style={{ height: 32, width: 32 }}>
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedCourses[c.id] && (
                  <tr>
                    <td colSpan={7} style={{ padding: "12px 24px", background: "var(--muted)" }}>
                      <div className="flex col gap-2" style={{ padding: "8px 0" }}>
                        <div className="t-xs fw-7 muted mb-2 flex items-center justify-between">
                          <span>บทเรียนในรายวิชานี้ ({c.lessonsCount} บทเรียน)</span>
                          <button className="btn btn-ghost btn-sm c-primary" onClick={(e) => { e.stopPropagation(); nav("/i/lesson/new?course_id=" + c.id); }} style={{ height: 24, fontSize: 11, padding: "0 8px" }}>
                            <Icon name="plus" size={12} /> เพิ่มบทเรียนใหม่
                          </button>
                        </div>
                        {c.lessons && c.lessons.length > 0 ? (
                          <div className="flex col gap-2">
                            {c.lessons.map((l) => (
                              <div key={l.id} className="flex items-center justify-between p-3 card" style={{ background: "#fff", cursor: "default" }} onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-3">
                                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>{String(l.index).padStart(2, "0")}</div>
                                  <div>
                                    <div className="t-sm fw-6">{l.title || "(ไม่มีชื่อบทเรียน)"}</div>
                                    <div className="flex items-center gap-2 t-xs muted mt-0.5">
                                      <Badge tone={l.status === "active" ? "success" : "muted"}>{l.status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button className="btn btn-outline btn-sm" onClick={() => nav("/i/lesson/" + l.id)} style={{ height: 28, fontSize: 12, padding: "0 10px" }}>
                                    <Icon name="pencil" size={13} /> จัดการ
                                  </button>
                                  <button className="iconbtn ghost c-danger" onClick={() => handleDeleteLesson(l, c.id)} style={{ height: 28, width: 28 }}>
                                    <Icon name="trash" size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="t-xs muted p-3 text-center card" style={{ background: "#fff", borderStyle: "dashed" }}>ยังไม่มีบทเรียนในรายวิชานี้</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )}
          />
    </div>
  );
}
