import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isStaffRole } from "@/lib/roles";

// Answer key for a student's OWN completed attempt, and only when the lesson shows answers.
// GET /api/tests/result?lessonId=..&kind=pre|post -> { answers: { [questionId]: choiceId } | null }
export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const studentId = token.dbId || token.sub;

  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get("lessonId");
  const kind = searchParams.get("kind");
  if (!lessonId || !["pre", "post"].includes(kind)) {
    return NextResponse.json({ error: "lessonId and kind (pre|post) are required" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const [{ data: lesson }, { data: score }] = await Promise.all([
      db.from("lessons").select("pretest, posttest").eq("id", lessonId).maybeSingle(),
      db.from("test_scores").select("pre, post").eq("student_id", studentId).eq("lesson_id", lessonId).maybeSingle(),
    ]);
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const config = kind === "pre" ? lesson.pretest : lesson.posttest;
    const completed = score && score[kind] !== null && score[kind] !== undefined;
    if (config?.show_answers === false || (!completed && !isStaffRole(token.role))) {
      return NextResponse.json({ answers: null }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: questions, error } = await db
      .from("questions")
      .select("id, answer")
      .eq("lesson_id", lessonId)
      .eq("kind", kind);
    if (error) throw error;
    return NextResponse.json(
      { answers: Object.fromEntries(questions.map((q) => [q.id, q.answer])) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("Test result failed:", e?.message || e);
    return NextResponse.json({ error: "Failed to load result" }, { status: 500 });
  }
}
