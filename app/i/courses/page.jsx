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

  useEffect(() => {
    async function load() {
      const [cRes, lRes, sRes, aRes, subRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("lessons").select("id, course_id"),
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
          const courseLessonsCount = allLessons.filter((l) => l.course_id === c.id).length;

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
            lessonsCount: courseLessonsCount,
            studentsCount: enrolledStudents.length,
            pendingGradingCount: pendingGradingCount
          };
        });

        setCourses(enrichedCourses);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="container">
      <PageHead kicker="พื้นที่อาจารย์ผู้สอน" title="จัดการรายวิชา"
        desc="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        right={<button className="btn btn-primary" onClick={() => nav("/i/course/new")}><Icon name="plus" size={16} />สร้างรายวิชา</button>} />
      <div className="card">
        {loading ? (
           <Loading className="p-5 text-center muted" />
        ) : (
          <Table 
            className="table hover"
            headers={[
              "รายวิชา", 
              <span className="hide-m" key="term">ภาคเรียน</span>, 
              "บทเรียน", 
              "นักศึกษา", 
              <span className="hide-m" key="needsGrading">รอตรวจ</span>, 
              ""
            ]}
            data={courses}
            renderRow={(c, i) => (
              <tr key={c.id} onClick={() => nav("/i/course/" + c.id)}>
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
                <td><Icon name="chevR" size={17} style={{ color: "var(--subtle)" }} /></td>
              </tr>
            )}
          />
        )}
      </div>
    </div>
  );
}
