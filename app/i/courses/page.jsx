"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";

export default function InstructorCourses() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  
  const nav = (path) => router.push(path);
  const confirm = useConfirm();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [cRes, lRes, sRes, aRes, subRes, ciRes] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("lessons").select("id, course_id, title, index, status").order("index", { ascending: true }),
      supabase.from("users").select("id, student_no, section, email").like("role", "%student%"),
      supabase.from("assignments").select("id, course_id"),
      supabase.from("submissions").select("id, assignment_id, status"),
      supabase.from("course_instructors").select("course_id").eq("user_id", user.id)
    ]);

    if (cRes.data) {
      const coursesList = cRes.data;
      const allLessons = lRes.data || [];
      const allStudents = sRes.data || [];
      const allAssignments = aRes.data || [];
      const allSubmissions = subRes.data || [];
      const myCourseIds = (ciRes?.data || []).map(ci => ci.course_id);

      const filteredCourses = coursesList.filter((c) => {
        // 1. Admin sees everything
        if (user?.role === "admin") return true;

        // 2. Course Manager sees all courses in their department (group_id / group_ids)
        if (user?.role === "course_manager") {
          return c.group_id === user.group_id || user.group_ids?.includes(c.group_id);
        }

        // 3. Instructor sees courses assigned to them
        if (user?.role === "instructor") {
          return myCourseIds.includes(c.id);
        }

        return false;
      });

      const enrichedCourses = filteredCourses.map((c) => {
        const courseLessons = allLessons.filter((l) => l.course_id === c.id);

        const courseSection = c.section;
        const allowedYears = c.access?.allowedYears || [];

        const courseStudents = allStudents.filter((s) => {
          if (allowedYears.length > 0) {
            const matchesYear = allowedYears.some((year) => s.student_no?.startsWith(year));
            if (!matchesYear) return false;
          }
          if (courseSection) {
            return s.section === courseSection;
          }
          return true;
        });

        const courseAssignments = allAssignments.filter((a) => a.course_id === c.id);
        const courseAssignmentIds = courseAssignments.map((a) => a.id);
        const courseSubmissions = allSubmissions.filter((s) => courseAssignmentIds.includes(s.assignment_id));
        const pendingCount = courseSubmissions.filter((s) => s.status === "submitted").length;

        return {
          ...c,
          lessons: courseLessons,
          lessonsCount: courseLessons.length,
          studentCount: courseStudents.length,
          pendingGrading: pendingCount,
        };
      });

      setCourses(enrichedCourses);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const toggleExpand = (courseId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const handleDeleteCourse = async (c) => {
    const confirmed = await confirm({
      title: "ลบรายวิชา",
      message: `คุณต้องการลบรายวิชา "${c.title} (${c.code})" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบบทเรียน, ข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของรายวิชานี้อย่างถาวรและไม่สามารถกู้คืนได้!`,
      danger: true,
      confirmText: "ลบรายวิชา",
      cancelText: "ยกเลิก"
    });

    if (!confirmed) {
      return;
    }

    try {
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("course_id", c.id);
      const assignmentIds = assignments?.map((a) => a.id) || [];
      const rubricIds = assignments?.map((a) => a.rubric_id).filter(Boolean) || [];

      const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", c.id);
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

      const { error: cErr } = await supabase.from("courses").delete().eq("id", c.id);
      if (cErr) throw cErr;

      toast("ลบรายวิชาเรียบร้อยแล้ว");
      load();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast("เกิดข้อผิดพลาดในการลบรายวิชา: " + error.message, "error");
    }
  };

  const handleDeleteLesson = async (l, courseId) => {
    const confirmed = await confirm({
      title: "ลบบทเรียน",
      message: `คุณต้องการลบบทเรียน "บทที่ ${l.index}: ${l.title}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`,
      danger: true,
      confirmText: "ลบบทเรียน",
      cancelText: "ยกเลิก"
    });

    if (!confirmed) {
      return;
    }

    try {
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("lesson_id", l.id);
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

      const { error: qErr } = await supabase.from("questions").delete().eq("lesson_id", l.id);
      if (qErr) throw qErr;

      const { error: lesErr } = await supabase.from("lessons").delete().eq("id", l.id);
      if (lesErr) throw lesErr;

      toast("ลบบทเรียนเรียบร้อยแล้ว");
      load();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast("เกิดข้อผิดพลาดในการลบบทเรียน: " + error.message, "error");
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
          (user?.role === "admin" || user?.role === "course_manager") && (
            <button className="btn btn-primary btn-sm" onClick={() => nav("/i/course/new")}>
              <Icon name="plus" size={15} />สร้างรายวิชา
            </button>
          )
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
                  <td className="num">{c.studentCount}</td>
                  <td className="hide-m">
                    {c.pendingGrading > 0 ? (
                      <Badge tone="warning" dot>{c.pendingGrading} ชิ้น</Badge>
                    ) : (
                      <span className="muted t-sm">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-outline btn-sm" onClick={() => nav("/i/course/" + c.id)} style={{ display: "flex", alignItems: "center", gap: 4, height: 32 }}>
                        <Icon name="pencil" size={13} /> จัดการรายวิชา
                      </button>
                      {(user?.role === "admin" || user?.role === "course_manager") && (
                        <button className="iconbtn ghost c-danger" onClick={() => handleDeleteCourse(c)} style={{ height: 32, width: 32 }}>
                          <Icon name="trash" size={15} />
                        </button>
                      )}
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
