import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { gradeAnswers } from "@/lib/grading";
import { isStaffRole } from "@/lib/roles";

// Grades a pre/post test on the server (answer key never leaves it) and upserts test_scores
// for the signed-in user only. Same columns/semantics the test page used to write directly.
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const studentId = token.dbId || token.sub;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { lessonId, kind, answers } = body || {};
  if (typeof lessonId !== "string" || !lessonId || !["pre", "post"].includes(kind)) {
    return NextResponse.json({ error: "lessonId and kind (pre|post) are required" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data: lesson } = await db
      .from("lessons")
      .select("id, status, pretest, posttest")
      .eq("id", lessonId)
      .maybeSingle();
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const isStaff = isStaffRole(token.role);
    if (lesson.status === "draft" && !isStaff) {
      return NextResponse.json({ error: "Lesson not available" }, { status: 403 });
    }

    const { data: questions, error: qErr } = await db
      .from("questions")
      .select("id, answer")
      .eq("lesson_id", lessonId)
      .eq("kind", kind);
    if (qErr) throw qErr;
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "No questions" }, { status: 404 });
    }

    const { data: existing } = await db
      .from("test_scores")
      .select("pre, post")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    // Same rule the page enforced client-side: single-attempt tests can't be retaken.
    const config = kind === "pre" ? lesson.pretest : lesson.posttest;
    const maxAttempts = config?.attempts ?? "1";
    const prior = existing ? existing[kind] : null;
    if (!isStaff && String(maxAttempts) === "1" && prior !== null && prior !== undefined) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }

    const graded = gradeAnswers(questions, answers);
    // Only this kind's columns + total are set; the other kind's columns are left as stored.
    const row = { student_id: studentId, lesson_id: lessonId, total: graded.total };
    if (kind === "pre") {
      row.pre = graded.correct;
      row.pre_answers = graded.answers;
    } else {
      row.post = graded.correct;
      row.post_answers = graded.answers;
    }
    const { error } = await db.from("test_scores").upsert(row, { onConflict: "student_id,lesson_id" });
    if (error) throw error;

    return NextResponse.json({ score: graded.correct, total: graded.total });
  } catch (e) {
    console.error("Test submit failed:", e?.message || e);
    return NextResponse.json({ error: "Failed to submit test" }, { status: 500 });
  }
}
