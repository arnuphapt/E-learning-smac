import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import type { TutorResult } from "@/lib/tutor-analysis";
import { tutorAttemptGate, tutorNotFound } from "@/lib/tutor-server";
import { loadQuestionMap, readExplainConfig, generateExplanation } from "@/lib/tutor-ai";
import { claimAiQuota, fillAiClaim, releaseAiClaim, type AiQuotaRpcDb, type AiQuotaTableDb } from "@/lib/ai-quota";
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

type RouteContext = { params: Promise<{ id: string }> };

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const estimateTokens = (text: string | null | undefined): number => Math.ceil((text || "").length / 2.5); // same estimate as /api/ai/chat

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const g = await tutorAttemptGate(req, params);
    if (g.error) return g.error;
    const { caller, db, studentId, attempt, lesson } = g;

    const rawBody: unknown = await req.json().catch(() => null);
    const body =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? (rawBody as { questionId?: unknown; messages?: unknown })
        : null;
    const questionId = typeof body?.questionId === "string" ? body.questionId : "";
    const gate = explainGate({ attempt, studentId, questionId });
    if (!gate.ok) return gate.reason === "not_ended" ? json({ state: "in_progress" }, 409) : tutorNotFound();
    const contents = toExplainContents(body?.messages);
    if (!contents) return json({ error: "messages are required" }, 400);

    const cfg = await readExplainConfig(db);
    const tokens = contents.reduce((s, c) => s + estimateTokens(c.parts[0].text), 0);
    if (tokens > cfg.sessionTokenLimit) return json({ error: "session_token_limit", used: tokens, limit: cfg.sessionTokenLimit }, 400);

    const questions = await loadQuestionMap(db, attempt);
    if (!questions[questionId]) return tutorNotFound(); // in the attempt but deleted since: nothing to explain
    const result = attempt.result as unknown as TutorResult;
    const system = buildExplainSystem({ persona: cfg.persona, isStaff: !!caller.staff, lessonTitle: lesson.title, questionId, rows: result.rows, questions });

    // Same row shape as /api/ai/chat logs; mode "explain" is what the quota counter (both routes) looks for.
    // Quota is claimed atomically (429 when none is left) for all roles.
    const quotaDb: AiQuotaRpcDb & AiQuotaTableDb = {
      rpc: (fn, args) =>
        db.rpc(fn, args as Database["public"]["Functions"]["ai_quota_claim"]["Args"]),
      from: (table) => db.from(table),
    };
    const sessionId = "tutor-" + attempt.id;
    const claim = await claimAiQuota(quotaDb, { studentId, limit: cfg.dailyLimit, mode: "explain", lessonId: lesson.id, courseId: lesson.course_id, sessionId });
    if (!claim.claimId) return json({ error: "rate_limit_exceeded", used: claim.used, limit: cfg.dailyLimit }, 429);
    const claimId = claim.claimId;
    const used = claim.used; // includes this claim

    try {
      const reply = stripEmotionTags(await generateExplanation({ system, contents, maxOutputTokens: cfg.maxOutputTokens, model: cfg.model }));
      if (!reply) throw new Error("empty reply from the model");

      // The log row IS the quota count, so an answer that could not be logged is not delivered (502, nothing shown).
      const message = contents[contents.length - 1].parts[0].text;
      await fillAiClaim(quotaDb, claimId, { message, reply });
      return json({ reply, rateLimitInfo: { used, limit: cfg.dailyLimit } });
    } catch (e) {
      if (claimId) await releaseAiClaim(quotaDb, claimId); // the call failed: it must not count against the quota
      throw e;
    }
  } catch (e: unknown) {
    console.error("Tutor explain failed:", e instanceof Error ? e.message : e);
    return json({ error: "Failed to get an explanation" }, 502);
  }
}
