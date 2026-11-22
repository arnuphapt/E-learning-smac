// Server-only: the DB half of "may this user view this R2 key" (the pure half is viewVerdict in lib/r2.js).
// Service role, identity from the session token only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { viewVerdict } from "@/lib/r2";
import {
  canStudentOpenLesson,
  type GradeRule,
  type SectionRule,
  type StudentAccessInput,
} from "@/lib/course-access";
import { isTutorOnlyRole } from "@/lib/roles";

export interface StudentContext {
  ok: boolean;
  student: StudentAccessInput & { tutorOnly: boolean };
  sections: SectionRule[];
  grades: GradeRule[];
}

export interface FileAccessToken {
  dbId?: unknown;
  sub?: unknown;
  email?: unknown;
  role?: unknown;
}

// Student profile + the lookup tables canStudentAccessCourse needs. Same shape the course pages build client-side.
export async function loadStudentContext(
  db: SupabaseClient<Database>,
  studentId: string,
  fallbackEmail = ""
): Promise<StudentContext> {
  const [{ data: user }, { data: sections }, { data: grades }] = await Promise.all([
    db.from("users").select("email, student_no, section, study_year, role").eq("id", studentId).maybeSingle(),
    db.from("sections").select("*"),
    db.from("student_grades").select("prefix, year_label, domain, year_no"),
  ]);
  return {
    ok: !!user, // false: no users row for this id (deleted since sign-in): callers must deny
    student: {
      email: user?.email || fallbackEmail,
      studentNo: user?.student_no || "",
      section: user?.section || "",
      studyYear: user?.study_year ?? null,
      tutorOnly: isTutorOnlyRole(user?.role), // external-domain user: year levels of their own domain, no section
    },
    sections: sections || [],
    grades: grades || [],
  };
}

// Async replacement for the old sync canView: staff and non-lesson keys are decided by viewVerdict; a student's
// lesson video/document additionally needs the lesson to exist, be active, and its course (normal or tutor) open to them.
export async function canViewKey(
  token: FileAccessToken | null | undefined,
  key: string
): Promise<boolean> {
  const v = viewVerdict(token, key);
  if (typeof v === "boolean") return v;
  try {
    const db = supabaseAdmin();
    const studentId =
      typeof token?.dbId === "string" && token.dbId
        ? token.dbId
        : typeof token?.sub === "string"
          ? token.sub
          : "";
    const fallbackEmail = typeof token?.email === "string" ? token.email : "";
    // the student context does not depend on the lesson: load it while lesson -> course (a dependent pair) is read
    const [{ lesson, course }, ctx] = await Promise.all([
      (async () => {
        const { data: lesson } = await db.from("lessons").select("id, status, course_id").eq("id", v.lessonId).maybeSingle();
        if (!lesson) return { lesson: null, course: null };
        if (!lesson.course_id) return { lesson, course: null };
        const { data: course } = await db
          .from("courses_all")
          .select("id, kind, section, year_level, access")
          .eq("id", lesson.course_id)
          .maybeSingle();
        return { lesson, course };
      })(),
      loadStudentContext(db, studentId, fallbackEmail),
    ]);
    if (!ctx.ok) return false; // the user row is gone: deny
    if (ctx.student.tutorOnly && course?.kind !== "tutor") return false; // a tutor-only user never opens a normal course's files
    return canStudentOpenLesson(lesson, course, ctx.student, ctx.sections, ctx.grades); // false when lesson or course is missing
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? (e as { message: unknown }).message
          : e;
    console.error("canViewKey failed (denying):", msg);
    return false; // fail closed
  }
}
