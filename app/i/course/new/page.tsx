"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN } from "@/lib/course-access";
import type { Json } from "@/lib/database.types";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { hasRole } from "@/lib/roles";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/states";
import type { UserRow } from "@/components/common/manager-select";
import { Button } from "@/components/ui/button";
import { type CourseDraft, type SectionRow, type SubjectGroupRow, type TermRow } from "@/components/course/draft";
import { CourseInfoCard } from "@/components/course/info-card";
import { CoursePreviewCard } from "@/components/course/preview-card";

type SubjectGroupManagerRow = { user_id: string; group_id: string };

export default function CreateCourse() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  // admin wins over course_manager when a user holds both
  const isCourseManagerOnly = hasRole(user?.role, "course_manager") && !hasRole(user?.role, "admin");

  useEffect(() => {
    if (status === "loading") return;
    if (!user || !hasPermission(user, PERMISSIONS.COURSES_CREATE)) {
      toast.error("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      router.push("/i/courses");
    }
  }, [user, status, router]);

  const [draft, setDraft] = useState<CourseDraft>({
    title: "",
    code: "",
    subtitle: "",
    term: "",
    credits: "3 (2-2-5)",
    subjectGroup: "",
    section: "",
    yearLevels: [],
    mainManagers: null,
    coInstructors: [],
  });
  const patch = (p: Partial<CourseDraft>) => setDraft((d) => ({ ...d, ...p }));

  const [terms, setTerms] = useState<TermRow[]>([]);
  const [instructors, setInstructors] = useState<UserRow[]>([]);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [groupManagers, setGroupManagers] = useState<SubjectGroupManagerRow[]>([]);
  const [masterYearLabels, setMasterYearLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-select the current user as main manager until the user picks someone
  const mainManagers = draft.mainManagers ?? (user?.id ? [user.id] : []);

  useEffect(() => {
    async function load() {
      const [tRes, uRes, gRes, sRes, sgmRes, gradeRes] = await Promise.all([
        supabase.from("terms").select("*"),
        supabase.from("users").select("*").or("role.like.%instructor%,role.like.%admin%,role.like.%course_manager%"),
        supabase.from("subject_groups").select("*").eq("status", "active"),
        supabase.from("sections").select("*").eq("status", "active"),
        supabase.from("subject_group_managers").select("*"),
        supabase.from("student_grades").select("year_label").eq("domain", DEFAULT_DOMAIN),
      ]);

      const fetchedTerms = tRes.data || [];
      setTerms(fetchedTerms);
      setInstructors(uRes.data || []);
      const fetchedGroups = gRes.data || [];
      setSubjectGroups(fetchedGroups);
      const fetchedGroupManagers = sgmRes.data || [];
      setGroupManagers(fetchedGroupManagers);

      const grades = gradeRes.data || [];
      setMasterYearLabels(Array.from(new Set(grades.map((g) => g.year_label).filter((y): y is string => Boolean(y)))).sort());

      // If course manager, auto-set their department and only show/pre-select it
      let subjectGroup = "";
      if (isCourseManagerOnly) {
        const myDbGroups = fetchedGroupManagers.filter((sgm) => sgm.user_id === user?.id).map((sgm) => sgm.group_id);
        subjectGroup = myDbGroups[0] || user?.group_id || fetchedGroups[0]?.id || "";
      } else if (fetchedGroups.length > 0) {
        subjectGroup = fetchedGroups[0].id;
      }

      const fetchedSections = sRes.data || [];
      setDraft((d) => ({
        ...d,
        term: fetchedTerms.length > 0 ? `${fetchedTerms[0].name} ${fetchedTerms[0].year}` : d.term,
        subjectGroup: subjectGroup || d.subjectGroup,
        section: fetchedSections.length > 0 ? fetchedSections[0].name || "" : d.section,
        coInstructors: [],
      }));
      setSections(fetchedSections);
      setLoading(false);
    }
    if (user) {
      load();
    }
  }, [user, isCourseManagerOnly]);

  // Group IDs managed by the current user computed directly from the fetched database managers
  const myManagedGroupIds = useMemo(() => {
    if (!user) return [];
    if (hasRole(user.role, "admin")) return subjectGroups.map((g) => g.id);

    const dbGroupIds = groupManagers.filter((sgm) => sgm.user_id === user.id).map((sgm) => sgm.group_id);
    if (user.group_id && !dbGroupIds.includes(user.group_id)) {
      dbGroupIds.push(user.group_id);
    }
    return dbGroupIds;
  }, [groupManagers, user, subjectGroups]);

  const filteredGroups = hasRole(user?.role, "admin") ? subjectGroups : subjectGroups.filter((g) => myManagedGroupIds.includes(g.id));

  const namesOf = (ids: string[]) => ids.map((id) => instructors.find((u) => u.id === id)?.name).filter((n): n is string => Boolean(n));

  const create = async () => {
    const { title, code, subtitle, term, subjectGroup, section, yearLevels, coInstructors } = draft;
    if (!title || !code) {
      toast.error("กรุณากรอกชื่อวิชาและรหัสวิชา");
      return;
    }
    if (mainManagers.length === 0) {
      toast.error("กรุณาเลือกอาจารย์ผู้รับผิดชอบหลักอย่างน้อย 1 คน");
      return;
    }

    let selectedYear: string | number | null = new Date().getFullYear() + 543;
    const selectedTermObj = terms.find((t) => `${t.name} ${t.year}` === term);
    if (selectedTermObj) {
      selectedYear = selectedTermObj.year;
    }

    const selectedGroup = subjectGroups.find((g) => g.id === subjectGroup);
    const mainManagerNames = namesOf(mainManagers);
    const mainManagerName = mainManagerNames.length > 0 ? mainManagerNames.join(", ") : (user?.name || "ไม่ระบุ");

    const newCourse = {
      id: "c_" + Date.now(),
      code,
      title,
      subtitle,
      term,
      year: String(selectedYear),
      instructor: mainManagerName,
      group_id: subjectGroup || null,
      group_name: selectedGroup?.name || null,
      section: section || null,
      lessons: 0,
      students: 0,
      progress: 0,
      hero: "#0d6e8c",
      year_level: yearLevels.map((y) => {
        const parsed = parseInt(String(y).replace(/\D/g, ""), 10);
        return isNaN(parsed) ? null : parsed;
      }).filter((y): y is number => Boolean(y)),
      access: { allowedYears: [], allowedEmails: [] } as Json,
      kind: "course",
    };

    const { error } = await supabase.from("courses_all").insert([newCourse]);

    if (error) {
      console.error("Error creating course", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างรายวิชา: " + error.message);
    } else {
      // Link main manager, selected instructors, and creator to course_instructors
      const uniqueUserIds = new Set<string>([...mainManagers, ...coInstructors]);
      if (user?.id) uniqueUserIds.add(user.id);

      const insertRows = Array.from(uniqueUserIds, (userId) => ({ course_id: newCourse.id, user_id: userId }));
      if (insertRows.length > 0) {
        const { error: linkError } = await supabase.from("course_instructors").insert(insertRows);
        if (linkError) {
          console.error("Error linking course instructors:", linkError);
        }
      }

      toast.success("สร้างรายวิชาเรียบร้อยแล้ว");
      setTimeout(() => router.push("/i/courses"), 700);
    }
  };

  if (status === "loading" || loading || !user || !hasPermission(user, PERMISSIONS.COURSES_CREATE)) {
    return (
      <PageContainer>
        <LoadingState className="min-h-[60vh]" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader kicker="พื้นที่อาจารย์ผู้สอน" title="สร้างรายวิชาใหม่" description="กรอกข้อมูลพื้นฐานของรายวิชา จากนั้นจึงเพิ่มบทเรียน วิดีโอ และแบบทดสอบได้" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_312px]">
        <div className="grid gap-4">
          <CourseInfoCard
            draft={draft}
            mainManagers={mainManagers}
            onChange={patch}
            groups={filteredGroups}
            groupLocked={isCourseManagerOnly && filteredGroups.length <= 1}
            terms={terms}
            sections={sections}
            instructors={instructors}
            yearLabels={masterYearLabels}
          />
        </div>

        {/* live preview + actions */}
        <aside className="grid gap-4 lg:sticky lg:top-4">
          <CoursePreviewCard
            code={draft.code}
            term={draft.term}
            title={draft.title}
            subtitle={draft.subtitle}
            mainManagerNames={namesOf(mainManagers)}
            coInstructorNames={namesOf(draft.coInstructors)}
            section={draft.section}
            groupName={subjectGroups.find((g) => g.id === draft.subjectGroup)?.name ?? null}
          />
          <div className="grid gap-2">
            <Button size="lg" disabled={!draft.title || !draft.code || !draft.term || mainManagers.length === 0} onClick={create}>
              <PlusIcon />
              สร้างรายวิชา
            </Button>
            <Button variant="outline" onClick={() => router.push("/i/courses")}>
              ยกเลิก
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">หลังสร้างแล้ว คุณจะเพิ่มบทเรียนและแบบทดสอบได้</p>
        </aside>
      </div>
    </PageContainer>
  );
}
