"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertCircleIcon, AwardIcon, ClockIcon, FileTextIcon } from "lucide-react";
import { DataTable } from "@/components/common/data-table";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { ScoreStatCards } from "@/components/grading/score-stat-cards";
import { assignmentColumns, type AssignmentListRow } from "@/components/student/assignment/columns";
import type { Database } from "@/lib/database.types";
import { STUDENT_LESSON_COLUMNS } from "@/lib/files";
import { isStaffRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

type CourseRow = Database["public"]["Views"]["courses"]["Row"];
type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

interface StudentLessonRow {
  id: string;
  status: string | null;
}

const STATUS_OPTIONS = [
  { value: "not-submitted", label: "ยังไม่ส่ง" },
  { value: "submitted", label: "ส่งแล้ว" },
  { value: "graded", label: "ตรวจแล้ว" },
];

export default function StudentAssignments() {
  const { data: session, status: authStatus } = useSession();
  const studentId = session?.dbId;
  const role = session?.user?.role;

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [lessons, setLessons] = useState<StudentLessonRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    async function loadData() {
      const [cRes, aRes, lRes, sRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("assignments").select("*"),
        supabase.from("lessons").select(STUDENT_LESSON_COLUMNS),
        studentId ? supabase.from("submissions").select("*").eq("student_id", studentId) : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      if (cRes.data) setCourses(cRes.data);
      if (aRes.data) setAssignments(aRes.data);
      if (lRes.data) setLessons(lRes.data);
      setSubmissions(studentId && sRes?.data ? sRes.data : []);
      setLoading(false);
    }
    loadData();
    return () => { cancelled = true; };
  }, [studentId, role, authStatus]);

  // Visible assignments joined with course info and the student's own submission status.
  const rows = useMemo<AssignmentListRow[]>(() => {
    const isStaff = isStaffRole(role);
    return assignments
      .filter((asg) => {
        const lesson = lessons.find((l) => l.id === asg.lesson_id);
        // draft lessons are invisible to students (RLS), so a missing lesson is hidden too
        return !((!lesson || lesson.status === "draft") && !isStaff);
      })
      .map((asg) => {
        const course = courses.find((c) => c.id === asg.course_id);
        const sub = submissions.find((s) => s.assignment_id === asg.id);
        return {
          ...asg,
          status: sub?.status || "not-submitted",
          score: sub ? sub.score : null,
          total: sub ? sub.total : asg.points,
          courseCode: course?.code || "N/A",
          courseTitle: course?.title || "ไม่พบรายวิชา",
          courseHero: course?.hero || "",
        };
      });
  }, [assignments, lessons, courses, submissions, role]);

  const count = (...statuses: string[]) => rows.filter((a) => statuses.includes(a.status)).length;
  const courseOptions = courses.map((c) => ({ value: c.id ?? "", label: c.code ?? "" })).filter((o) => o.value);

  return (
    <PageContainer>
      <PageHeader
        kicker="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        title="ใบงานของฉัน"
        description="ติดตามสถานะใบงานที่มอบหมาย ส่งกระบวนการพยาบาล และดูคะแนนประเมินพร้อมข้อเสนอแนะจากอาจารย์"
      />

      <ScoreStatCards
        items={[
          { label: "ใบงานทั้งหมด", value: `${rows.length} รายการ`, icon: <FileTextIcon /> },
          { label: "ส่งแล้ว (รอตรวจ)", value: `${count("submitted")} รายการ`, icon: <ClockIcon /> },
          { label: "ตรวจแล้ว", value: `${count("graded")} รายการ`, icon: <AwardIcon /> },
          { label: "ยังไม่ส่ง / เกินกำหนด", value: `${count("not-submitted", "late")} รายการ`, icon: <AlertCircleIcon /> },
        ]}
      />

      <DataTable.Root data={rows} columns={assignmentColumns} getRowId={(r: AssignmentListRow) => r.id} searchKeys={["title", "courseCode", "courseTitle"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อใบงาน หรือรหัสวิชา…" />
          <DataTable.Filter column="course_id" options={courseOptions} allLabel="ทุกรายวิชา" />
          <DataTable.Filter column="status" options={STATUS_OPTIONS} allLabel="ทุกสถานะ" />
        </DataTable.Toolbar>
        <DataTable.Content
          loading={loading}
          empty={<EmptyState icon={<FileTextIcon />} title="ไม่พบใบงานตามเงื่อนไขที่เลือก" description="ลองเปลี่ยนตัวกรอง หรือค้นหาคำอื่น" />}
        />
        <DataTable.Pagination />
      </DataTable.Root>
    </PageContainer>
  );
}
