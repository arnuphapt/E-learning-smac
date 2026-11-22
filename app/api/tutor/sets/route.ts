import { NextResponse, type NextRequest } from "next/server";
import { tutorCaller, TUTOR_SET_COLUMNS, publicSet, type TutorCourseRow } from "@/lib/tutor-server";

// GET /api/tutor/sets -> the tutor sets this caller may open (year / section / email lock enforced here).
export async function GET(req: NextRequest) {
  const caller = await tutorCaller(req);
  if (caller.error) return caller.error;
  const { db } = caller;

  try {
    const { data: courses, error } = await db
      .from("courses_all")
      .select(`${TUTOR_SET_COLUMNS}, kind, section, year_level, access`)
      .eq("kind", "tutor")
      .order("code");
    if (error) throw error;

    const allowed = (
      await Promise.all(((courses || []) as TutorCourseRow[]).map(async (c) => ((await caller.canOpen(c)) ? c : null)))
    ).filter((c): c is TutorCourseRow => Boolean(c));
    const ids = allowed.map((c) => c.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: lessons, error: lErr } = await db.from("lessons").select("course_id").in("course_id", ids).eq("status", "active");
      if (lErr) throw lErr;
      for (const l of lessons || []) if (l.course_id) counts[l.course_id] = (counts[l.course_id] || 0) + 1;
    }
    return NextResponse.json(
      { sets: allowed.map((c) => ({ ...publicSet(c), lessons: counts[c.id] || 0 })) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    console.error("Tutor sets failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to load tutor sets" }, { status: 500 });
  }
}
