// Server-only Gemini side of tutor mode (ticket 06): AI result summary, explain-mode call.
// The prompt text / schema / parsing live in lib/tutor-prompt.js (pure, unit tested); this file only does I/O.
import { GoogleGenAI } from "@google/genai";
import { SUMMARY_SCHEMA, SUMMARY_SYSTEM, buildSummaryInput, parseSummary, isFinalSummary } from "@/lib/tutor-prompt";

export const TUTOR_AI_MODEL = "gemini-2.5-flash";
const AI_TIMEOUT_MS = 30000;
// Thinking tokens count against maxOutputTokens: with thinking on, a Thai answer / the JSON can be cut off. Off for both calls.
// (GenerateContentConfig.thinkingConfig, ThinkingConfig.thinkingBudget: 0 = disabled; node_modules/@google/genai genai.d.ts)
const NO_THINKING = { thinkingBudget: 0 };
const SUMMARY_CLAIM_TTL_MS = 60000; // a "generating" claim older than this is a crashed request: another open may take over

let client = null;
const gemini = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

// Live questions of an attempt (text / choices / teacher explanation) keyed by id. Tutor questions only.
export async function loadQuestionMap(db, attempt) {
  const { data, error } = await db
    .from("questions")
    .select("id, text, choices, explanation")
    .in("id", attempt.question_ids)
    .eq("lesson_id", attempt.lesson_id)
    .eq("kind", "tutor");
  if (error) throw error;
  return Object.fromEntries((data || []).map((q) => [q.id, q]));
}

// ---- summary ----
// -> { summary } (stored or just generated) | { summary: null, state: "busy" } (another request is generating it)
// Throws when Gemini fails: the caller answers 502 and the claim is released, so the next open retries.
// A stored summary is never regenerated. The claim is a conditional UPDATE (summary IS NULL, or the exact stale claim),
// made BEFORE the Gemini call, so two concurrent opens cannot both call Gemini: only the winner of the UPDATE does.
export async function ensureSummary(db, attempt, nowMs = Date.now()) {
  const cur = attempt.summary;
  if (isFinalSummary(cur)) return { summary: cur };
  const stale = cur?.pending && nowMs - Date.parse(cur.at) > SUMMARY_CLAIM_TTL_MS;
  if (cur?.pending && !stale) return { summary: null, state: "busy" };

  const at = new Date(nowMs).toISOString();
  const claimQ = db.from("tutor_attempts").update({ summary: { pending: true, at } }).eq("id", attempt.id).neq("status", "in_progress");
  const { data: won, error: cErr } = await (cur ? claimQ.eq("summary->>at", cur.at) : claimQ.is("summary", null)).select("id").maybeSingle();
  if (cErr) throw cErr;
  if (!won) return { summary: null, state: "busy" }; // someone else claimed first

  const release = () => db.from("tutor_attempts").update({ summary: null }).eq("id", attempt.id).eq("summary->>at", at);
  try {
    const [questions, { data: lesson }] = await Promise.all([
      loadQuestionMap(db, attempt),
      db.from("lessons").select("title").eq("id", attempt.lesson_id).maybeSingle(),
    ]);
    const res = await gemini().models.generateContent({
      model: TUTOR_AI_MODEL,
      contents: buildSummaryInput({ lessonTitle: lesson?.title, result: attempt.result, questions }),
      config: {
        systemInstruction: SUMMARY_SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: SUMMARY_SCHEMA,
        maxOutputTokens: 4096,
        thinkingConfig: NO_THINKING,
        temperature: 0.4,
        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      },
    });
    const body = parseSummary(res.text);
    if (!body) throw new Error("summary: model output does not match the schema");
    const summary = { version: 1, ...body, model: TUTOR_AI_MODEL, generated_at: new Date().toISOString() };
    const { error } = await db.from("tutor_attempts").update({ summary }).eq("id", attempt.id).eq("summary->>at", at);
    if (error) throw error;
    return { summary };
  } catch (e) {
    await release().then(() => {}, () => {}); // best effort: a stuck claim also expires by itself
    throw e;
  }
}

// What the result API sends out: the final summary, never the "generating" claim.
export const publicSummary = (s) => (isFinalSummary(s) ? s : null);

// ---- explain: config + shared daily quota ----
const CONFIG_DEFAULTS = { daily_chat_limit: 15, session_token_limit: 20000, max_output_tokens: 2048 };

// ai_settings via the service role: the numbers /api/ai/chat reads, plus staff's persona_explain ("" = use the code default).
export async function readExplainConfig(db) {
  const { data } = await db.from("ai_settings").select("key, value");
  const get = (k) => data?.find((r) => r.key === k)?.value;
  const num = (k) => parseInt(get(k), 10) || CONFIG_DEFAULTS[k];
  return {
    persona: get("persona_explain") || "",
    dailyLimit: num("daily_chat_limit"),
    sessionTokenLimit: num("session_token_limit"),
    maxOutputTokens: num("max_output_tokens"),
  };
}

export async function generateExplanation({ system, contents, maxOutputTokens }) {
  const res = await gemini().models.generateContent({
    model: TUTOR_AI_MODEL,
    contents,
    config: { systemInstruction: system, maxOutputTokens, thinkingConfig: NO_THINKING, temperature: 0.7, abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS) },
  });
  return res.text || "";
}
