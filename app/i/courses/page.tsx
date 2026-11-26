"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { BookOpenIcon, ClipboardCheckIcon, FilePenLineIcon, LayersIcon, PlusIcon } from "lucide-react";
import { StatCards } from "@/components/common/stat-cards";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN, sectionRangeMatch } from "@/lib/course-access";
import type { Json } from "@/lib/database.types";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { hasRole } from "@/lib/roles";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/states";
import { useConfirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { courseColumns } from "@/components/course/columns";
import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { CourseLessonList } from "@/components/course/lesson-list";
import type { CourseLessonSummary, EnrichedCourse } from "@/components/course/types";
import { LessonWizardDialog } from "@/components/lesson/lesson-wizard-dialog";

interface CourseAccessJson {
  allowedEmails?: string[];
  [key: string]: unknown;
}

function parseCourseAccess(raw: Json | null | undefined): CourseAccessJson {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as CourseAccessJson;
}

export default function InstructorCourses() {
  const { data: session } = useSession();
  const user = session?.user;

  const confirm = useConfirm();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [lessonWizard, setLessonWizard] = useState<{ mode: "create"; courseId: string | null; lessonsCount: number } | { mode: "edit"; lessonId: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [cRes, lRes, sRes, aRes, subRes, ciRes, sgRes, secRes] = await Promise.all([
          supabase.from("courses").select("*"),
          supabase.from("lessons").select("id, course_id, title, index, status").order("index", { ascending: true }),
          supabase.from("users").select("id, student_no, section, email, study_year").eq("role", "student"),
          supabase.from("assignments").select("id, course_id"),
          supabase.from("submissions").select("id, assignment_id, status"),
          supabase.from("course_instructors").select("course_id").eq("user_id", user.id || ""),
          supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
          supabase.from("sections").select("*")
        ]);
  
        if (cRes.data) {
          const coursesList = cRes.data;
          const allLessons = lRes.data || [];
          const allStudents = sRes.data || [];
          const allAssignments = aRes.data || [];
          const allSubmissions = subRes.data || [];
          const myCourseIds = (ciRes?.data || []).map(ci => ci.course_id);
          const sectionsList = secRes?.data || [];
  
          const userRoles = user?.role?.split(",").map(r => r.trim()) || [];
          const filteredCourses = coursesList.filter((c) => {
            if (userRoles.includes("admin")) return true;
            if (userRoles.includes("course_manager")) {
              return c.group_id === user.group_id || (c.group_id ? Boolean(user.group_ids?.includes(c.group_id)) : false);
            }
            if (userRoles.includes("instructor")) {
              return Boolean(c.id && myCourseIds.includes(c.id));
            }
            return false;
          });
  
          const gradesList = sgRes?.data || [];
  
          const enrichedCourses: EnrichedCourse[] = filteredCourses.map((c) => {
            const courseLessons = allLessons.filter((l) => l.course_id === c.id);
  
            const courseSection = c.section;
            const allowedYears = (c.year_level || []) as Array<number | string>;
            const allowedEmails = parseCourseAccess(c.access).allowedEmails || [];
            const courseStudents = allStudents.filter((s) => {
              if (s.email && allowedEmails.includes(s.email)) {
                return true;
              }
              if (allowedYears.length > 0) {
                const prefix = s.student_no ? s.student_no.substring(0, 2) : "";
                const mapping = gradesList.find(g => g.prefix === prefix);
                const studentLabel = mapping ? mapping.year_label : null;
                const studentFallback = s.study_year ? Number(s.study_year) : null;
                
                const hasMatch = allowedYears.some(ay => {
                  if (typeof ay === 'number' || !isNaN(Number(ay))) {
                     return Number(ay) === studentFallback || ay == studentFallback;
                  }
                  return ay === studentLabel;
                });
                if (!hasMatch) return false;
              }
              if (courseSection && courseSection !== "ไม่ระบุ Section") {
                const rangeMatch = sectionRangeMatch(s.student_no, courseSection, sectionsList);
                if (rangeMatch === null) {
                  if (s.section !== courseSection) return false;
                } else if (!rangeMatch) {
                  return false;
                }
              }
              return true;
            });
  
            const courseAssignments = allAssignments.filter((a) => a.course_id === c.id);
            const courseAssignmentIds = courseAssignments.map((a) => a.id);
            const courseSubmissions = allSubmissions.filter((s) => Boolean(s.assignment_id && courseAssignmentIds.includes(s.assignment_id)));
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
    load();
  }, [user, reloadKey]);

  const toggleExpand = (courseId: string) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const handleDeleteCourse = async (c: EnrichedCourse) => {
    if (!c.id) return;
    const confirmed = await confirm({
      title: "ลบรายวิชา",
      desc: `คุณต้องการลบรายวิชา "${c.title} (${c.code})" ใช่หรือไม่?`,
      message: `คำเตือน: การดำเนินการนี้จะลบบทเรียน, ข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของรายวิชานี้อย่างถาวรและไม่สามารถกู้คืนได้!`,
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
      const rubricIds = assignments?.map((a) => a.rubric_id).filter((id): id is string => Boolean(id)) || [];

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

      toast.success("ลบรายวิชาเรียบร้อยแล้ว");
      setReloadKey((k) => k + 1);
    } catch (error: unknown) {
      console.error("Error deleting course:", error);
      toast.error("เกิดข้อผิดพลาดในการลบรายวิชา: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteLesson = async (l: CourseLessonSummary) => {
    const confirmed = await confirm({
      title: "ลบบทเรียน",
      desc: `คุณต้องการลบบทเรียน "บทที่ ${l.index}: ${l.title}" ใช่หรือไม่?`,
      message: `คำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`,
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
      const rubricIds = assignments?.map((a) => a.rubric_id).filter((id): id is string => Boolean(id)) || [];

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

      toast.success("ลบบทเรียนเรียบร้อยแล้ว");
      setReloadKey((k) => k + 1);
    } catch (error: unknown) {
      console.error("Error deleting lesson:", error);
      toast.error("เกิดข้อผิดพลาดในการลบบทเรียน: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleOpenCreateLesson = (courseId: string | null, lessonsCount: number) => {
    setLessonWizard({ mode: "create", courseId, lessonsCount });
  };

  const handleOpenEditLesson = (lessonId: string) => {
    setLessonWizard({ mode: "edit", lessonId });
  };

  const canManage = hasRole(user?.role, "admin", "course_manager");
  const canCreate = canManage && hasPermission(user, PERMISSIONS.COURSES_CREATE);
  const termOptions = useMemo(
    () => [...new Set(courses.map((c) => c.term).filter((t): t is string => Boolean(t)))].sort().map((t) => ({ value: t, label: t })),
    [courses],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters, the supabase client and the confirm dialog
  const columns = useMemo(() => courseColumns({ expanded: expandedCourses, onToggle: toggleExpand, canManage, onDelete: handleDeleteCourse }), [expandedCourses, canManage]);

  return (
    <PageContainer>
      <PageHeader
        kicker="พื้นที่อาจารย์ผู้สอน"
        title="จัดการรายวิชา"
        description="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        actions={
          canCreate && (
            <Button onClick={() => setCreateCourseOpen(true)}>
              <PlusIcon />
              สร้างรายวิชา
            </Button>
          )
        }
      />
      <p className="mb-3 text-sm text-muted-foreground">รายชื่อวิชาในกลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ</p>
      <StatCards
        stats={[
          { label: "รายวิชา", value: courses.length, icon: <BookOpenIcon /> },
          { label: "บทเรียนทั้งหมด", value: courses.reduce((n, c) => n + c.lessonsCount, 0), icon: <LayersIcon /> },
          { label: "บทเรียนฉบับร่าง", value: courses.reduce((n, c) => n + c.lessons.filter((l) => l.status !== "active").length, 0), icon: <FilePenLineIcon /> },
          { label: "ใบงานรอตรวจ", value: courses.reduce((n, c) => n + c.pendingGrading, 0), icon: <ClipboardCheckIcon />, tone: "warning" },
        ]}
      />
      <DataTable.Root data={courses} columns={columns} getRowId={(c: EnrichedCourse) => c.id ?? ""} searchKeys={["title", "code", "subtitle", "term"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหารายวิชา…" />
          {termOptions.length > 0 && <DataTable.Filter column="term" options={termOptions} allLabel="ทุกภาคเรียน" />}
        </DataTable.Toolbar>
        <DataTable.Content
          loading={loading}
          empty={<EmptyState title="ยังไม่มีรายวิชา" />}
          subRow={(c: EnrichedCourse) =>
            expandedCourses[c.id ?? ""] ? (
              <CourseLessonList course={c} onCreateLesson={handleOpenCreateLesson} onEditLesson={handleOpenEditLesson} onDeleteLesson={handleDeleteLesson} />
            ) : null
          }
        />
        <DataTable.Pagination />
      </DataTable.Root>
      {createCourseOpen && (
        <CreateCourseDialog
          user={user}
          onClose={() => setCreateCourseOpen(false)}
          onCreated={() => {
            setCreateCourseOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
      {lessonWizard && (
        <LessonWizardDialog
          lessonId={lessonWizard.mode === "edit" ? lessonWizard.lessonId : null}
          courseId={lessonWizard.mode === "create" ? lessonWizard.courseId : null}
          lessonsCount={lessonWizard.mode === "create" ? lessonWizard.lessonsCount : undefined}
          onClose={() => setLessonWizard(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </PageContainer>
  );
}
