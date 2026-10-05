// Server-only helpers shared by the /api/tutor/* routes. Identity comes from the NextAuth session cookie, never from
// the request body. DB access is the service role (RLS bypassed), so every route must call canOpen() itself.
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isStaffRole } from "@/lib/roles";
import { canStudentAccessTutorSet } from "@/lib/course-access";

// Course columns a student may see. `access` (other students' emails) and `year_level` never go out.
export const TUTOR_SET_COLUMNS = "id, code, title, subtitle, term, year, instructor, hero";
const COURSE_GATE_COLUMNS = `${TUTOR_SET_COLUMNS}, section, year_level, access`;

// Drops the gate columns (and `kind`) before a course row goes to the browser.
export const publicSet = (c) => Object.fromEntries(TUTOR_SET_COLUMNS.split(", ").map((k) => [k, c[k]]));

// One answer for "missing", "not a tutor set" and "locked": no existence oracle.
export const tutorNotFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

// -> { error: Response } | { db, studentId, canOpen(course) }
// canOpen(course) is the course-access lock: staff always, a student only when year / section / email lock allows
// (and never for a set with no lock: tutor sets fail closed).
export async function tutorCaller(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const studentId = token.dbId || token.sub;
  const db = supabaseAdmin();
  const staff = isStaffRole(token.role);

  let ctxPromise; // student profile + lookup tables, loaded once per request and only for non-staff
  const load = async () => {
    const [{ data: user }, { data: sections }, { data: grades }] = await Promise.all([
      db.from("users").select("email, student_no, section, study_year").eq("id", studentId).maybeSingle(),
      db.from("sections").select("*"),
      db.from("student_grades").select("prefix, year_label"),
    ]);
    return {
      student: {
        email: user?.email || token.email || "",
        studentNo: user?.student_no || "",
        section: user?.section || "",
        studyYear: user?.study_year ?? null,
      },
      sections: sections || [],
      grades: grades || [],
    };
  };

  return {
    db,
    studentId,
    staff,
    async canOpen(course) {
      if (!course || course.kind !== "tutor") return false;
      if (staff) return true;
      const ctx = await (ctxPromise ??= load());
      return canStudentAccessTutorSet(course, ctx.student, ctx.sections, ctx.grades);
    },
  };
}

// Tutor course by id, with the gate columns; null when missing or not a tutor set.
export async function loadTutorCourse(db, id) {
  const { data } = await db
    .from("courses_all")
    .select(`${COURSE_GATE_COLUMNS}, kind`)
    .eq("id", id)
    .eq("kind", "tutor")
    .maybeSingle();
  return data || null;
}
