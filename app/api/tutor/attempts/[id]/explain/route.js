import { NextResponse } from "next/server";
import { tutorAttemptGate, tutorNotFound } from "@/lib/tutor-server";
import { loadQuestionMap, readExplainConfig, generateExplanation } from "@/lib/tutor-ai";
import { claimAiQuota, fillAiClaim, releaseAiClaim } from "@/lib/ai-quota";
import { explainGate, buildExplainSystem, toExplainContents, stripEmotionTags } from "@/lib/tutor-prompt";

// "Ask AI" about one question of an ENDED attempt (explain mode, ticket 06). Separate from /api/ai/chat: its own prompt
// (core rules + persona_explain + question context), no [emotion] tags, but the SAME daily quota (ai_chat_logs rows with
// mode "explain" are counted by /api/ai/chat too). The quota is claimed atomically BEFORE the Gemini call (lib/ai-quota.js,
// migration 20261006040000): a placeholder row under a per-student lock, filled with the reply, deleted if the call fails.
//   POST /api/tutor/attempts/<attemptId>/explain   { questionId, messages: [{ role: "user" | "assistant", content }] }
//   200 { reply, rateLimitInfo }
//   400 bad body / { error: "session_token_limit" }
//   404 not the caller's attempt, or the question is not in it (no existence oracle)
//   409 { state: "in_progress" }  before submit: nothing about the questions is revealed
//   429 { error: "rate_limit_exceeded" }   502 Gemini failed (nothing logged, nothing counted)
// Identity = session. The context is built from the attempt's stored result + the live question, never from the body.

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const estimateTokens = (text) => Math.ceil((text || "").length / 2.5); // same estimate as /api/ai/chat

export async function POST(req, { params }) {
  try {
    const g = await tutorAttemptGate(req, params);
    if (g.error) return g.error;
    const { caller, db, studentId, attempt, lesson } = g;

    const body = await req.json().catch(() => null);
    const questionId = typeof body?.questionId === "string" ? body.questionId : "";
    const gate = explainGate({ attempt, studentId, questionId });
    if (!gate.ok) return gate.reason === "not_ended" ? json({ state: "in_progress" }, 409) : tutorNotFound();
    const contents = toExplainContents(body.messages);
    if (!contents) return json({ error: "messages are required" }, 400);

    const cfg = await readExplainConfig(db);
    if (!caller.staff) {
      const tokens = contents.reduce((s, c) => s + estimateTokens(c.parts[0].text), 0);
      if (tokens > cfg.sessionTokenLimit) return json({ error: "session_token_limit", used: tokens, limit: cfg.sessionTokenLimit }, 400);
    }

    const questions = await loadQuestionMap(db, attempt);
    if (!questions[questionId]) return tutorNotFound(); // in the attempt but deleted since: nothing to explain
    const system = buildExplainSystem({ persona: cfg.persona, lessonTitle: lesson.title, questionId, rows: attempt.result.rows, questions });

    // Same row shape as /api/ai/chat logs; mode "explain" is what the quota counter (both routes) looks for.
    // Students claim their slot first (429 when none is left); staff are not limited but are still logged.
    const sessionId = "tutor-" + attempt.id;
    let claimId = null;
    let used = 0;
    if (!caller.staff) {
      const claim = await claimAiQuota(db, { studentId, limit: cfg.dailyLimit, mode: "explain", lessonId: lesson.id, courseId: lesson.course_id, sessionId });
      if (!claim.claimId) return json({ error: "rate_limit_exceeded", used: claim.used, limit: cfg.dailyLimit }, 429);
      claimId = claim.claimId;
      used = claim.used; // includes this claim
    }

    try {
      const reply = stripEmotionTags(await generateExplanation({ system, contents, maxOutputTokens: cfg.maxOutputTokens }));
      if (!reply) throw new Error("empty reply from the model");

      // The log row IS the quota count, so an answer that could not be logged is not delivered (502, nothing shown).
      const message = contents[contents.length - 1].parts[0].text;
      if (claimId) {
        await fillAiClaim(db, claimId, { message, reply });
      } else {
        const { error: logErr } = await db.from("ai_chat_logs").insert({
          student_id: studentId,
          lesson_id: lesson.id,
          course_id: lesson.course_id,
          message,
          reply,
          mode: "explain",
          session_id: sessionId,
        });
        if (logErr) throw logErr;
      }
      return json({ reply, rateLimitInfo: caller.staff ? null : { used, limit: cfg.dailyLimit } });
    } catch (e) {
      if (claimId) await releaseAiClaim(db, claimId); // the call failed: it must not count against the quota
      throw e;
    }
  } catch (e) {
    console.error("Tutor explain failed:", e?.message || e);
    return json({ error: "Failed to get an explanation" }, 502);
  }
}
