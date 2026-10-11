import { NextResponse } from "next/server";
import { tutorAttemptGate } from "@/lib/tutor-server";
import { ensureSummary, readExplainConfig } from "@/lib/tutor-ai";

// AI summary of the caller's ENDED tutor attempt (ticket 06). Generated on the first call, stored on the attempt, and
// returned from storage afterwards: opening the result again never calls Gemini again. Kept apart from the result GET so
// the page loads at once and the summary fills in when Gemini answers.
//   POST /api/tutor/attempts/<attemptId>/summary
//   200 { summary }                     stored or just generated
//   200 { summary: null, state: "busy" } another request is generating it right now: open the page again later
//   409 { state: "in_progress" }        not ended yet: nothing to summarise
//   404                                 not the caller's attempt / lock closed
//   429 { error: "rate_limit_exceeded" } the daily AI quota (shared with explain / chat) is used up; only a call that
//                                       would really generate is charged, a stored summary never is
//   502                                 Gemini failed: nothing was stored, the next open retries

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export async function POST(req, { params }) {
  try {
    const g = await tutorAttemptGate(req, params);
    if (g.error) return g.error;
    const { db, attempt, studentId, lesson } = g;
    if (attempt.status === "in_progress") return json({ state: "in_progress" }, 409);
    if (!attempt.result) throw new Error("ended attempt without a stored result");
    const cfg = await readExplainConfig(db);
    const out = await ensureSummary(db, attempt, { studentId, limit: cfg.dailyLimit, lessonId: lesson.id, courseId: lesson.course_id });
    if (out.state === "quota") return json({ error: "rate_limit_exceeded", used: out.used, limit: cfg.dailyLimit }, 429);
    return json(out);
  } catch (e) {
    console.error("Tutor summary failed:", e?.message || e);
    return json({ error: "Failed to generate summary" }, 502);
  }
}
