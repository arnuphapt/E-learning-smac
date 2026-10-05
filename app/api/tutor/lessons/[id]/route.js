import { NextResponse } from "next/server";
import { tutorCaller, loadTutorCourse, publicSet, tutorNotFound } from "@/lib/tutor-server";

// GET /api/tutor/lessons/<lessonId> -> lesson (video key, description) of an active lesson in a tutor set the caller
// may open. The video itself is served by /api/files (presigned R2 URL), same as course lessons.
// Never returns questions, answers or explanations.
export async function GET(req, { params }) {
  const caller = await tutorCaller(req);
  if (caller.error) return caller.error;
  const { db } = caller;
  const { id } = await params;

  try {
    const { data: lesson, error } = await db
      .from("lessons")
      .select("id, course_id, index, title, duration, description, video_url, status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    // students: active lessons only (same as lessons_select); staff may preview drafts
    if (!lesson || (lesson.status !== "active" && !caller.staff)) return tutorNotFound();

    const course = await loadTutorCourse(db, lesson.course_id);
    if (!course || !(await caller.canOpen(course))) return tutorNotFound();

    const { id: lessonId, index, title, duration, description, video_url } = lesson;
    return NextResponse.json(
      { set: publicSet(course), lesson: { id: lessonId, index, title, duration, description, video_url } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("Tutor lesson failed:", e?.message || e);
    return NextResponse.json({ error: "Failed to load tutor lesson" }, { status: 500 });
  }
}
