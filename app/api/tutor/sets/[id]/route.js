import { NextResponse } from "next/server";
import { tutorCaller, loadTutorCourse, publicSet, tutorNotFound } from "@/lib/tutor-server";

// GET /api/tutor/sets/<courseId> -> { set, lessons } for a tutor set the caller may open. Never returns questions.
export async function GET(req, { params }) {
  const caller = await tutorCaller(req);
  if (caller.error) return caller.error;
  const { db } = caller;
  const { id } = await params;

  try {
    const course = await loadTutorCourse(db, id);
    if (!course || !(await caller.canOpen(course))) return tutorNotFound();

    const { data: lessons, error } = await db
      .from("lessons")
      .select("id, index, title, duration, description, video, video_url")
      .eq("course_id", course.id)
      .eq("status", "active")
      .order("index", { ascending: true });
    if (error) throw error;

    return NextResponse.json(
      {
        set: publicSet(course),
        lessons: (lessons || []).map(({ video, video_url, ...l }) => ({ ...l, hasVideo: !!(video_url || video) })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("Tutor set failed:", e?.message || e);
    return NextResponse.json({ error: "Failed to load tutor set" }, { status: 500 });
  }
}
