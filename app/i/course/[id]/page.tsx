"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { BookOpenIcon, ChartColumnIcon, FileTextIcon, PlusIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN } from "@/lib/course-access";
import type { Json } from "@/lib/database.types";
import { hasRole } from "@/lib/roles";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { useConfirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteCourseCascade, deleteLessonCascade } from "@/components/course/actions";
import { CoInstructorCard } from "@/components/course/co-instructor-card";
import { CourseDangerZone } from "@/components/course/danger-zone-card";
import {
  getEnrolledStudents,
  parseCourseAccess,
  toYearNumbers,
  type CourseAssignmentRef,
  type CourseRow,
  type GradeRow,
  type InstructorOption,
  type LessonRow,
  type SectionRow,
  type StudentRow,
  type SubmissionRow,
  type TestScoreRow,
} from "@/components/course/detail";
import { CourseEditCard, type CourseEditValues } from "@/components/course/edit-card";
import { LessonReorderList } from "@/components/course/lesson-reorder-list";
import { CourseStats } from "@/components/course/stats-row";
import { StudentRoster } from "@/components/course/student-roster";

type CourseTab = "lessons" | "students" | "settings";

const errMsg = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function InstructorCourse() {
  const router = useRouter();
  const params = useParams();
  const confirm = useConfirm();
  const { data: session } = useSession();
  const user = session?.user;
  const canManage = hasRole(user?.role, "admin", "course_manager");

  const rawId = params?.id;
  const courseId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignmentRef[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [testScores, setTestScores] = useState<TestScoreRow[]>([]);
  const [courseInstructors, setCourseInstructors] = useState<InstructorOption[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<InstructorOption[]>([]);
  const [allInstructors, setAllInstructors] = useState<InstructorOption[]>([]);
  const [mainManagerIds, setMainManagerIds] = useState<string[]>([]);
  const [masterYearLabels, setMasterYearLabels] = useState<string[]>([]);
  const [gradesList, setGradesList] = useState<GradeRow[]>([]);
  const [sectionsList, setSectionsList] = useState<SectionRow[]>([]);
  const [tab, setTab] = useState<CourseTab>("lessons");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!courseId || !user) return;
    const load = async () => {
      const [cRes, lRes, sRes, subRes, tsRes, aRes, ciRes, insRes, sgRes, secRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("index", { ascending: true }),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("submissions").select("*"),
        supabase.from("test_scores").select("*"),
        supabase.from("assignments").select("id, lesson_id").eq("course_id", courseId),
        supabase.from("course_instructors").select("user_id").eq("course_id", courseId),
        supabase.from("users").select("id, name, email, role, group_id").or("role.like.%instructor%,role.like.%course_manager%,role.like.%admin%"),
        supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
        supabase.from("sections").select("*").eq("status", "active"),
      ]);

      // The `courses` view hides tutor sets, so fall back to courses_all to load one for editing.
      const cData = cRes.data ?? (await supabase.from("courses_all").select("*").eq("id", courseId).single()).data;
      // tutor sets are managed in their own workspace, never through the course editor
      if (cData?.kind === "tutor") {
        router.replace("/i/tutor/" + courseId);
        return;
      }
      if (cData) {
        const c = cData;
        const instructorsList = ciRes?.data || [];
        const isInstructorAssigned = instructorsList.some((i) => i.user_id === user?.id);

        // Security check:
        // 1. Admin has access to everything
        // 2. Course manager has access to courses in their group/department OR assigned to them
        // 3. Instructor has access to courses assigned to them
        let hasAccess = false;
        if (hasRole(user?.role, "admin")) {
          hasAccess = true;
        } else if (hasRole(user?.role, "course_manager")) {
          hasAccess = c.group_id === user.group_id || (c.group_id ? Boolean(user.group_ids?.includes(c.group_id)) : false) || isInstructorAssigned;
        } else if (hasRole(user?.role, "instructor")) {
          hasAccess = isInstructorAssigned;
        }

        if (!hasAccess) {
          toast.error("คุณไม่มีสิทธิ์เข้าถึงหรือจัดการรายวิชานี้");
          router.push("/i/courses");
          return;
        }

        setCourse(c);

        const allInstructorsInDb = insRes.data || [];
        setAllInstructors(allInstructorsInDb);

        const assignedIds = instructorsList.map((ci) => ci.user_id);

        // Find matching users for c.instructor (comma-separated names)
        const instructorNames = (c.instructor || "").split(",").map((n) => n.trim()).filter(Boolean);
        const matchingUsers = allInstructorsInDb.filter((u) => instructorNames.includes(u.name));
        let managerIds = matchingUsers.map((u) => u.id);
        if (managerIds.length === 0) {
          const groupCM = allInstructorsInDb.find((u) => u.group_id === c.group_id && u.role?.split(",").map((r) => r.trim()).includes("course_manager"));
          managerIds = groupCM ? [groupCM.id] : [];
        }
        setMainManagerIds(managerIds);

        // Main managers are not listed as co-instructors; already-assigned ones are not offered again
        setCourseInstructors(allInstructorsInDb.filter((inst) => assignedIds.includes(inst.id) && !managerIds.includes(inst.id)));
        setAvailableInstructors(allInstructorsInDb.filter((inst) => !assignedIds.includes(inst.id) && !managerIds.includes(inst.id)));
      }
      if (lRes.data) setLessons(lRes.data);
      if (sRes.data) setStudents(sRes.data);
      if (subRes.data) setSubmissions(subRes.data);
      if (tsRes.data) {
        const lessonIds = lRes.data ? lRes.data.map((l) => l.id) : [];
        setTestScores(tsRes.data.filter((ts) => Boolean(ts.lesson_id && lessonIds.includes(ts.lesson_id))));
      }
      if (aRes.data) setAssignments(aRes.data);

      if (sgRes?.data) {
        setGradesList(sgRes.data);
        setMasterYearLabels(Array.from(new Set(sgRes.data.map((g) => g.year_label).filter((y): y is string => Boolean(y)))).sort());
      }
      if (secRes?.data) setSectionsList(secRes.data);

      setLoading(false);
    };
    load();
  }, [courseId, user, reloadKey, router]);

  const handleAddInstructor = async (userIds: string[]) => {
    if (!courseId || userIds.length === 0) return;
    try {
      const { error } = await supabase.from("course_instructors").insert(userIds.map((uid) => ({ course_id: courseId, user_id: uid })));
      if (error) throw error;
      toast.success("เพิ่มอาจารย์ผู้สอนร่วมเรียบร้อยแล้ว");
      reload();
    } catch (error: unknown) {
      toast.error("เกิดข้อผิดพลาด: " + errMsg(error));
    }
  };

  const handleRemoveInstructor = async (userId: string) => {
    if (!courseId) return;
    const confirmed = await confirm({
      title: "ยกเลิกสิทธิ์เข้าสอน",
      message: "คุณต้องการถอดถอนอาจารย์ท่านนี้ออกจากรายวิชาใช่หรือไม่? อาจารย์ท่านนี้จะไม่สามารถเข้าจัดการวิชานี้ได้อีกต่อไป",
      danger: true,
      confirmText: "ถอดถอน",
      cancelText: "ยกเลิก",
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("course_instructors").delete().eq("course_id", courseId).eq("user_id", userId);
      if (error) throw error;
      toast.success("ถอดถอนอาจารย์ผู้สอนร่วมเรียบร้อยแล้ว");
      reload();
    } catch (error: unknown) {
      toast.error("เกิดข้อผิดพลาด: " + errMsg(error));
    }
  };

  const handleCreateLesson = async () => {
    try {
      toast.info("กำลังสร้างบทเรียนใหม่...");
      const newId = "l_" + Date.now();
      const testDefaults = { required: false, passing_score: 50, time_limit: 30, attempts: "1", shuffle: true, show_answers: true, due: null, due_time: "23:59" };
      const { error } = await supabase.from("lessons").insert([
        {
          id: newId,
          course_id: courseId,
          title: "บทเรียนใหม่",
          description: "",
          duration: "",
          status: "draft",
          index: lessons.length + 1,
          video: false,
          pretest: testDefaults,
          posttest: testDefaults,
          assignment: null,
          watch_limit: false,
          allow_download: true,
          allow_ai: true,
          has_docs: true,
          has_pretest: true,
          has_posttest: true,
          has_assignment: true,
        },
      ]);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการสร้างบทเรียน: " + error.message);
      } else {
        toast.success("สร้างบทเรียนใหม่สำเร็จแล้ว");
        router.push(`/i/lesson/${newId}`);
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบทเรียน: " + errMsg(error));
    }
  };

  const handleDeleteLesson = async (lesson: LessonRow) => {
    const confirmed = await confirm({
      title: "ลบบทเรียน",
      message: `คุณต้องการลบบทเรียน "${lesson.title}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`,
      danger: true,
      confirmText: "ลบบทเรียน",
      cancelText: "ยกเลิก",
    });
    if (!confirmed) return;

    try {
      await deleteLessonCascade(lesson.id);
      toast.success("ลบบทเรียนเรียบร้อยแล้ว");
      reload();
    } catch (error: unknown) {
      console.error("Error deleting lesson:", error);
      toast.error("เกิดข้อผิดพลาดในการลบบทเรียน: " + errMsg(error));
    }
  };

  const handleUpdateCourse = async ({ title, managerIds, yearLevels, section }: CourseEditValues) => {
    if (!course?.id) return;
    if (!title) {
      toast.warning("กรุณากรอกชื่อรายวิชา");
      return;
    }

    try {
      const managerNames = managerIds.map((id) => allInstructors.find((u) => u.id === id)?.name).filter((n): n is string => Boolean(n));
      const managerName = managerNames.length > 0 ? managerNames.join(", ") : course.instructor;

      const updatedAccess = { ...parseCourseAccess(course.access) };
      delete updatedAccess.sectionRanges;
      const updatedAccessJson = updatedAccess as Json;
      const finalYearLevels = toYearNumbers(yearLevels);

      const { error } = await supabase
        .from("courses_all")
        .update({ title, year_level: finalYearLevels, instructor: managerName, section, access: updatedAccessJson })
        .eq("id", course.id);
      if (error) throw error;

      // Ensure all main managers are in course_instructors
      for (const mgId of managerIds) {
        const { data: existing } = await supabase.from("course_instructors").select("user_id").eq("course_id", course.id).eq("user_id", mgId);
        if (!existing || existing.length === 0) {
          await supabase.from("course_instructors").insert({ course_id: course.id, user_id: mgId });
        }
      }

      setCourse({ ...course, title, year_level: finalYearLevels, instructor: managerName, section, access: updatedAccessJson });
      toast.success("บันทึกข้อมูลรายวิชาเรียบร้อยแล้ว");
      reload();
    } catch (error: unknown) {
      console.error("Error updating course:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูลรายวิชา: " + errMsg(error));
    }
  };

  const handleUpdateAllowedEmails = async (newEmails: string[]) => {
    if (!course?.id) return;
    try {
      const updatedAccess = { ...parseCourseAccess(course.access), allowedEmails: newEmails } as Json;
      const { error } = await supabase.from("courses_all").update({ access: updatedAccess }).eq("id", course.id);
      if (error) throw error;
      toast.success("อัปเดตรายชื่อนักศึกษาเพิ่มเติมเรียบร้อยแล้ว");
      reload();
    } catch (error: unknown) {
      console.error("Error updating allowed emails:", error);
      toast.error("เกิดข้อผิดพลาดในการอัปเดตรายชื่อนักศึกษา: " + errMsg(error));
    }
  };

  const handleDeleteCourse = async () => {
    if (!course?.id) return;
    const confirmed = await confirm({
      title: "ลบรายวิชา",
      message: `คุณต้องการลบรายวิชา "${course.title} (${course.code})" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบบทเรียน, ข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของรายวิชานี้อย่างถาวรและไม่สามารถกู้คืนได้!`,
      danger: true,
      confirmText: "ลบรายวิชา",
      cancelText: "ยกเลิก",
    });
    if (!confirmed) return;

    try {
      await deleteCourseCascade(course.id);
      toast.success("ลบรายวิชาเรียบร้อยแล้ว");
      router.push("/i/courses");
    } catch (error: unknown) {
      console.error("Error deleting course:", error);
      toast.error("เกิดข้อผิดพลาดในการลบรายวิชา: " + errMsg(error));
    }
  };

  const handleReorder = async (reordered: LessonRow[]) => {
    // Optimistically update state
    setLessons(reordered);
    try {
      toast.info("กำลังบันทึกลำดับบทเรียนใหม่...");
      const results = await Promise.all(reordered.map((l) => supabase.from("lessons").update({ index: l.index }).eq("id", l.id)));
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
      toast.success("จัดลำดับบทเรียนสำเร็จ");
    } catch (error: unknown) {
      console.error("Error updating lesson order:", error);
      toast.error("เกิดข้อผิดพลาดในการจัดลำดับบทเรียน: " + errMsg(error));
      reload();
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState className="min-h-[60vh]" />
      </PageContainer>
    );
  }
  if (!course) {
    return (
      <PageContainer>
        <EmptyState title="ไม่พบข้อมูลรายวิชา" description="ไม่พบข้อมูลรายวิชาตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของระบบ" className="min-h-[60vh]" />
      </PageContainer>
    );
  }

  const allowedEmails = parseCourseAccess(course.access).allowedEmails || [];
  const enrolledStudents = getEnrolledStudents(course, students, sectionsList, gradesList);

  const courseAssignmentIds = assignments.map((a) => a.id);
  const courseSubmissions = submissions.filter((sub) => Boolean(sub.assignment_id && courseAssignmentIds.includes(sub.assignment_id)));
  const pendingSubmissionsCount = courseSubmissions.filter((sub) => sub.status === "submitted").length;

  const enrolledStudentIds = enrolledStudents.map((s) => s.id);
  const enrolledScores = testScores.filter((ts) => Boolean(ts.student_id && enrolledStudentIds.includes(ts.student_id)));
  const postScores = enrolledScores.map((ts) => ts.post).filter((score): score is number => score !== null && score !== undefined);
  const avgPostTest = postScores.length > 0 ? (postScores.reduce((a, b) => a + b, 0) / postScores.length).toFixed(1) : "—";

  return (
    <PageContainer>
      <PageHeader
        kicker={course.term ?? undefined}
        title={course.title ?? ""}
        description={course.code ?? undefined}
        actions={
          <>
            {canManage && (
              <Button variant="outline" onClick={() => setTab("settings")}>
                <SettingsIcon />
                ตั้งค่า
              </Button>
            )}
            <Button onClick={handleCreateLesson}>
              <PlusIcon />
              เพิ่มบทเรียน
            </Button>
          </>
        }
      />

      <CourseStats
        stats={[
          { label: "บทเรียน", value: lessons.length, icon: <BookOpenIcon /> },
          { label: "นักศึกษา", value: enrolledStudents.length, icon: <UsersIcon /> },
          { label: "รอตรวจใบงาน", value: pendingSubmissionsCount, icon: <FileTextIcon /> },
          { label: "คะแนนเฉลี่ย Post-test", value: avgPostTest, icon: <ChartColumnIcon /> },
        ]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as CourseTab)} className="gap-4">
        <TabsList>
          <TabsTrigger value="lessons">
            <BookOpenIcon />
            บทเรียน
          </TabsTrigger>
          <TabsTrigger value="students">
            <UsersIcon />
            นักศึกษา
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="settings">
              <SettingsIcon />
              ตั้งค่ารายวิชา
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lessons">
          <LessonReorderList lessons={lessons} assignments={assignments} submissions={submissions} onReorder={handleReorder} onCreate={handleCreateLesson} onDelete={handleDeleteLesson} />
        </TabsContent>
        <TabsContent value="students">
          <StudentRoster
            students={enrolledStudents}
            courseSubmissions={courseSubmissions}
            assignments={assignments}
            allStudents={students}
            allowedEmails={allowedEmails}
            onUpdateAllowedEmails={handleUpdateAllowedEmails}
            sectionsList={sectionsList}
          />
        </TabsContent>
        {canManage && (
          // forceMount keeps unsaved edits when switching tabs
          <TabsContent value="settings" forceMount className="grid gap-4 data-[state=inactive]:hidden">
            <CourseEditCard course={course} allInstructors={allInstructors} initialManagerIds={mainManagerIds} yearLabels={masterYearLabels} sections={sectionsList} onSave={handleUpdateCourse} />
            <CoInstructorCard assigned={courseInstructors} available={availableInstructors} currentUserId={user?.id} onAdd={handleAddInstructor} onRemove={handleRemoveInstructor} />
            <CourseDangerZone onDelete={handleDeleteCourse} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
