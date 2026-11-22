"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/states";
import { aiLogColumns } from "@/components/ai/log-columns";
import { AiLogDialog } from "@/components/ai/log-dialog";
import { AiLogFilters } from "@/components/ai/log-filters";
import type { AiChatLogRow, EnrichedAiLog } from "@/components/ai/log-types";

type CourseRow = Database["public"]["Views"]["courses"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type StudentRow = Database["public"]["Tables"]["users"]["Row"];

export default function InstructorAiLogs() {
  const { data: session } = useSession();
  const user = session?.user;

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [aiLogs, setAiLogs] = useState<AiChatLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedLessonId, setSelectedLessonId] = useState("all");
  const [selectedMode, setSelectedMode] = useState("all");
  const [activeLog, setActiveLog] = useState<EnrichedAiLog | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const [cRes, lRes, sRes, ciRes, aiRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("lessons").select("*").order("index", { ascending: true }),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("course_instructors").select("course_id").eq("user_id", user.id || ""),
        supabase.from("ai_chat_logs").select("*").neq("reply", "").order("created_at", { ascending: false }), // reply "" = in-flight quota claim, not a message
      ]);

      if (cRes.data) {
        const coursesList = cRes.data;
        const myCourseIds = (ciRes?.data || []).map((ci) => ci.course_id);
        const userRoles = user?.role?.split(",").map((r) => r.trim()) || [];

        // Filter courses instructor is assigned to
        const filteredCourses = coursesList.filter((c) => {
          if (userRoles.includes("admin")) return true;
          if (userRoles.includes("course_manager")) {
            return c.group_id === user.group_id || (c.group_id ? user.group_ids?.includes(c.group_id) : false);
          }
          if (userRoles.includes("instructor")) {
            return Boolean(c.id && myCourseIds.includes(c.id));
          }
          return false;
        });

        const allowedCourseIds = filteredCourses.map((c) => c.id);
        setCourses(filteredCourses);
        setLessons((lRes.data || []).filter((l) => allowedCourseIds.includes(l.course_id)));
        setStudents(sRes.data || []);
        // Filter logs belonging to allowed courses
        setAiLogs((aiRes.data || []).filter((log) => allowedCourseIds.includes(log.course_id)));
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const lessonsForSelectedCourse = lessons.filter((l) => selectedCourseId === "all" || l.course_id === selectedCourseId);

  const enrichedLogs: EnrichedAiLog[] = useMemo(() => {
    return aiLogs.map((log) => {
      const student = students.find((s) => s.id === log.student_id) || { name: "Unknown Student", student_no: "-" };
      const lesson = lessons.find((l) => l.id === log.lesson_id) || { index: "-", title: "Unknown Lesson" };
      const course = courses.find((c) => c.id === log.course_id) || { code: "", title: "Unknown Course" };

      return {
        ...log,
        studentName: student.name,
        studentNo: student.student_no,
        lessonIndex: lesson.index,
        lessonTitle: lesson.title,
        courseCode: course.code,
        courseTitle: course.title,
      };
    });
  }, [aiLogs, students, lessons, courses]);

  const filteredLogs = enrichedLogs.filter((log) => {
    const matchesCourse = selectedCourseId === "all" || log.course_id === selectedCourseId;
    const matchesLesson = selectedLessonId === "all" || log.lesson_id === selectedLessonId;
    const matchesMode = selectedMode === "all" || log.mode === selectedMode;
    return matchesCourse && matchesLesson && matchesMode;
  });

  const columns = useMemo(() => aiLogColumns(setActiveLog), []);

  return (
    <PageContainer>
      <PageHeader
        kicker="ระบบหลังบ้าน"
        title="ประวัติการใช้งาน AI"
        description="ประวัติการป้อนคำถามและขอสรุปเนื้อหาบทเรียนของนักศึกษากับ AI ติวเตอร์ในรายวิชาที่คุณดูแล"
      />
      <p className="mb-3 text-sm text-muted-foreground">กดปุ่ม “ดูรายละเอียด” เพื่ออ่านบทสนทนาระหว่างนักศึกษากับ AI อย่างละเอียด</p>

      <DataTable.Root
        data={filteredLogs}
        columns={columns}
        getRowId={(log: EnrichedAiLog) => String(log.id)}
        searchKeys={["studentName", "studentNo", "message", "courseCode", "courseTitle"]}
      >
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อนักศึกษา รหัสวิชา หรือคำถาม..." />
          <AiLogFilters
            courses={courses}
            lessons={lessonsForSelectedCourse}
            courseId={selectedCourseId}
            lessonId={selectedLessonId}
            mode={selectedMode}
            onCourseChange={(id) => {
              setSelectedCourseId(id);
              setSelectedLessonId("all");
            }}
            onLessonChange={setSelectedLessonId}
            onModeChange={setSelectedMode}
          />
        </DataTable.Toolbar>
        <DataTable.Content loading={loading} empty={<EmptyState title="ยังไม่มีประวัติการใช้งาน AI" />} />
        <DataTable.Pagination />
      </DataTable.Root>

      {activeLog && (
        <AiLogDialog
          log={activeLog}
          studentEmail={students.find((s) => s.id === activeLog.student_id)?.email ?? null}
          onClose={() => setActiveLog(null)}
        />
      )}
    </PageContainer>
  );
}
