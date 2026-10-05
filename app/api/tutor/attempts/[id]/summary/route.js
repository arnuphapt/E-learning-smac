import { NextResponse } from "next/server";
import { tutorAttemptGate } from "@/lib/tutor-server";
import { ensureSummary } from "@/lib/tutor-ai";

// AI summary of the caller's ENDED tutor attempt (ticket 06). Generated on the first call, stored on the attempt, and
// returned from storage afterwards: opening the result again never calls Gemini again. Kept apart from the result GET so
// the page loads at once and the summary fills in when Gemini answers.
//   POST /api/tutor/attempts/<attemptId>/summary
//   200 { summary }                     stored or just generated
//   200 { summary: null, state: "busy" } another request is generating it right now: open the page again later
//   409 { state: "in_progress" }        not ended yet: nothing to summarise
//   404                                 not the caller's attempt / lock closed
//   502                                 Gemini failed: nothing was stored, the next open retries

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export async function POST(req, { params }) {
  try {
    const g = await tutorAttemptGate(req, params);
    if (g.error) return g.error;
    const { db, attempt } = g;
    if (attempt.status === "in_progress") return json({ state: "in_progress" }, 409);
    if (!attempt.result) throw new Error("ended attempt without a stored result");
    return json(await ensureSummary(db, attempt));
  } catch (e) {
    console.error("Tutor summary failed:", e?.message || e);
    return json({ error: "Failed to generate summary" }, 502);
  }
}
