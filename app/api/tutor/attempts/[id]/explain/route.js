import { NextResponse } from "next/server";
import { tutorAttemptGate, tutorNotFound } from "@/lib/tutor-server";
import { loadQuestionMap, readExplainConfig, countTodayAiCalls, generateExplanation } from "@/lib/tutor-ai";
import { explainGate, buildExplainSystem, toExplainContents, stripEmotionTags } from "@/lib/tutor-prompt";

// "Ask AI" about one question of an ENDED attempt (explain mode, ticket 06). Separate from /api/ai/chat: its own prompt
// (core rules + persona_explain + question context), no [emotion] tags, but the SAME daily quota (ai_chat_logs rows with
// mode "explain" are counted by /api/ai/chat too).
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
    const used = caller.staff ? 0 : await countTodayAiCalls(db, studentId);
    if (!caller.staff) {
      const tokens = contents.reduce((s, c) => s + estimateTokens(c.parts[0].text), 0);
      if (tokens > cfg.sessionTokenLimit) return json({ error: "session_token_limit", used: tokens, limit: cfg.sessionTokenLimit }, 400);
      if (used >= cfg.dailyLimit) return json({ error: "rate_limit_exceeded", used, limit: cfg.dailyLimit }, 429);
    }

    const questions = await loadQuestionMap(db, attempt);
    if (!questions[questionId]) return tutorNotFound(); // in the attempt but deleted since: nothing to explain
    const system = buildExplainSystem({ persona: cfg.persona, lessonTitle: lesson.title, questionId, rows: attempt.result.rows, questions });

    const reply = stripEmotionTags(await generateExplanation({ system, contents, maxOutputTokens: cfg.maxOutputTokens }));
    if (!reply) throw new Error("empty reply from the model");

    // Same row shape as /api/ai/chat logs; mode "explain" is what the quota counter (both routes) looks for.
    // The log row IS the quota count, so an answer that could not be logged is not delivered (502, nothing shown).
    // ponytail: parallel requests can still overshoot the daily limit by the in-flight count (the count is read before the
    // Gemini call, same as /api/ai/chat). Upgrade: insert a claim row before calling Gemini and fill the reply after.
    const { error: logErr } = await db.from("ai_chat_logs").insert({
      student_id: studentId,
      lesson_id: lesson.id,
      course_id: lesson.course_id,
      message: contents[contents.length - 1].parts[0].text,
      reply,
      mode: "explain",
      session_id: "tutor-" + attempt.id,
    });
    if (logErr) throw logErr;

    return json({ reply, rateLimitInfo: caller.staff ? null : { used: used + 1, limit: cfg.dailyLimit } });
  } catch (e) {
    console.error("Tutor explain failed:", e?.message || e);
    return json({ error: "Failed to get an explanation" }, 502);
  }
}
