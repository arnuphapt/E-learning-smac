// Server-only helpers shared by the /api/tutor/* routes. Identity comes from the NextAuth session cookie, never from
// the request body. DB access is the service role (RLS bypassed), so every route must call canOpen() itself.
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isStaffRole } from "@/lib/roles";
import { canStudentAccessTutorSet } from "@/lib/course-access";
import { isPastDeadline } from "@/lib/tutor-attempt";
import { scoreAttempt } from "@/lib/tutor-score";
import { buildResult } from "@/lib/tutor-analysis";

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

// Lesson of a tutor set the caller may open (session identity + course lock), shared by the attempt and result routes.
// students: active lessons only (same as lessons_select); staff may preview drafts.
// -> { error: Response } | { db, studentId, lesson }
export async function tutorLessonGate(req, params) {
  const caller = await tutorCaller(req);
  if (caller.error) return { error: caller.error };
  const { id } = await params;
  const { db, studentId } = caller;
  const { data: lesson, error } = await db
    .from("lessons")
    .select("id, course_id, status, tutor_draw_count")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!lesson || (lesson.status !== "active" && !caller.staff)) return { error: tutorNotFound() };
  const course = await loadTutorCourse(db, lesson.course_id);
  if (!course || !(await caller.canOpen(course))) return { error: tutorNotFound() };
  return { db, studentId, lesson };
}

// ---- attempt ending (shared by the attempt, answer and submit routes) ----
// result / summary (migration 20261006030000) are NULL while in_progress; only the result route ever returns them.
export const ATTEMPT_END_COLUMNS =
  "id, student_id, lesson_id, question_ids, total, started_at, deadline_at, status, score, submitted_at, result, summary";

// Ended attempt -> the ONLY thing a student gets back before the full review (ticket 05): score and total.
export const endedBody = (a) => ({ state: "ended", status: a.status, score: a.score, total: a.total, submittedAt: a.submitted_at });

// The one place an attempt ends and is scored. Returns the attempt row as stored afterwards.
//   in_progress, past deadline -> status 'expired', submitted_at = deadline_at, scored
//   in_progress, submit = true -> status 'submitted', submitted_at = now, scored
//   in_progress otherwise      -> untouched (still running)
//   already ended, result set  -> returned unchanged (idempotent: a second submit never changes the result)
//   already ended, result NULL -> scored now (a round ended before migration 20261006030000, or flipped by ticket 03)
// score AND result (per-question rows with topic / correct-answer snapshots + per-topic analysis, lib/tutor-analysis.js)
// are written in the SAME conditional update (status in_progress / result IS NULL), so two requests racing to end the
// same attempt cannot overwrite each other (the loser re-reads the winner's row) and the stored score always equals
// the stored review. The review reads ONLY `result`: an answer upsert that commits after the answers were read here is
// simply not part of it (no transaction across the read and the write, and none is needed).
export async function settleAttempt(db, attempt, nowMs, { submit = false } = {}) {
  let end = null;
  if (attempt.status === "in_progress") {
    if (isPastDeadline(attempt.deadline_at, nowMs)) end = { status: "expired", submitted_at: attempt.deadline_at };
    else if (submit) end = { status: "submitted", submitted_at: new Date(nowMs).toISOString() };
    else return attempt;
  } else if (attempt.result != null) {
    return attempt;
  }

  const [{ data: keys, error: kErr }, { data: answers, error: aErr }, { data: topics, error: tErr }, { data: lesson, error: lErr }] =
    await Promise.all([
      db.from("questions").select("id, answer, topic_id").in("id", attempt.question_ids).eq("lesson_id", attempt.lesson_id).eq("kind", "tutor"),
      db.from("tutor_answers").select("question_id, chosen, answered_at").eq("attempt_id", attempt.id),
      db.from("tutor_topics").select("id, name").eq("lesson_id", attempt.lesson_id),
      db.from("lessons").select("title").eq("id", attempt.lesson_id).maybeSingle(),
    ]);
  for (const e of [kErr, aErr, tErr, lErr]) if (e) throw e;
  const { score, rows } = scoreAttempt({ questionIds: attempt.question_ids, keys: keys || [], answers: answers || [], deadlineAt: attempt.deadline_at });
  const result = buildResult({ rows, keys: keys || [], topics: topics || [], lessonName: lesson?.title });

  const base = db.from("tutor_attempts").update({ ...end, score, result }).eq("id", attempt.id);
  const { data, error } = await (end ? base.eq("status", "in_progress") : base.neq("status", "in_progress").is("result", null))
    .select(ATTEMPT_END_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: stored, error: rErr } = await db.from("tutor_attempts").select(ATTEMPT_END_COLUMNS).eq("id", attempt.id).single();
  if (rErr) throw rErr;
  return stored;
}

// The caller's own attempt by id (ownership is the access check: a stranger's id looks like a missing one); null otherwise.
export async function loadOwnAttempt(db, studentId, id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null; // not a uuid: would be a 500 from Postgres
  const { data, error } = await db.from("tutor_attempts").select(ATTEMPT_END_COLUMNS).eq("id", id).eq("student_id", studentId).maybeSingle();
  if (error) throw error;
  return data;
}

// The caller's own attempt by id for the AI routes (summary, explain): session identity, the course lock still applies,
// and an attempt past its deadline is ended + scored first (so "ended" is decided here, never by the client).
// The attempt may still be in_progress: the route decides what that means.
// -> { error: Response } | { caller, db, studentId, attempt, lesson: { id, title, course_id } }
export async function tutorAttemptGate(req, params) {
  const caller = await tutorCaller(req);
  if (caller.error) return { error: caller.error };
  const { db, studentId } = caller;
  const { id } = await params;
  const found = await loadOwnAttempt(db, studentId, id);
  if (!found) return { error: tutorNotFound() };
  const { data: lesson, error } = await db.from("lessons").select("id, title, course_id, status").eq("id", found.lesson_id).maybeSingle();
  if (error) throw error;
  if (!lesson || (lesson.status !== "active" && !caller.staff)) return { error: tutorNotFound() };
  const course = await loadTutorCourse(db, lesson.course_id);
  if (!course || !(await caller.canOpen(course))) return { error: tutorNotFound() };
  const attempt = await settleAttempt(db, found, Date.now());
  return { caller, db, studentId, attempt, lesson };
}
