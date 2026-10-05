// Server-only: the DB half of "may this user view this R2 key" (the pure half is viewVerdict in lib/r2.js).
// Service role, identity from the session token only.
import { supabaseAdmin } from "@/lib/supabase-admin";
import { viewVerdict } from "@/lib/r2";
import { canStudentOpenLesson } from "@/lib/course-access";

// Student profile + the lookup tables canStudentAccessCourse needs. Same shape the course pages build client-side.
export async function loadStudentContext(db, studentId, fallbackEmail = "") {
  const [{ data: user }, { data: sections }, { data: grades }] = await Promise.all([
    db.from("users").select("email, student_no, section, study_year").eq("id", studentId).maybeSingle(),
    db.from("sections").select("*"),
    db.from("student_grades").select("prefix, year_label"),
  ]);
  return {
    student: {
      email: user?.email || fallbackEmail,
      studentNo: user?.student_no || "",
      section: user?.section || "",
      studyYear: user?.study_year ?? null,
    },
    sections: sections || [],
    grades: grades || [],
  };
}

// Async replacement for the old sync canView: staff and non-lesson keys are decided by viewVerdict; a student's
// lesson video/document additionally needs the lesson to exist, be active, and its course (normal or tutor) open to them.
export async function canViewKey(token, key) {
  const v = viewVerdict(token, key);
  if (typeof v === "boolean") return v;
  try {
    const db = supabaseAdmin();
    // the student context does not depend on the lesson: load it while lesson -> course (a dependent pair) is read
    const [{ lesson, course }, ctx] = await Promise.all([
      (async () => {
        const { data: lesson } = await db.from("lessons").select("id, status, course_id").eq("id", v.lessonId).maybeSingle();
        if (!lesson) return {};
        const { data: course } = await db
          .from("courses_all")
          .select("id, kind, section, year_level, access")
          .eq("id", lesson.course_id)
          .maybeSingle();
        return { lesson, course };
      })(),
      loadStudentContext(db, token.dbId || token.sub, token.email || ""),
    ]);
    return canStudentOpenLesson(lesson, course, ctx.student, ctx.sections, ctx.grades); // false when lesson or course is missing
  } catch (e) {
    console.error("canViewKey failed (denying):", e?.message || e);
    return false; // fail closed
  }
}
