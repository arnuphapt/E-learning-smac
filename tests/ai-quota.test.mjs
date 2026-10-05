import { test } from "node:test";
import assert from "node:assert/strict";
import { claimAiQuota, fillAiClaim, releaseAiClaim } from "../lib/ai-quota.js";

const rpcDb = (result) => ({ rpc: async (name, args) => ({ ...result, name, args }) });

test("claimAiQuota passes the identity and context through as p_* args and maps the row", async () => {
  let seen;
  const db = { rpc: async (name, args) => { seen = { name, args }; return { data: [{ claim_id: "c1", used: 4 }], error: null }; } };
  const r = await claimAiQuota(db, { studentId: "s1", limit: 15, mode: "chat", lessonId: "l1", courseId: "c1", sessionId: "x" });
  assert.deepEqual(r, { claimId: "c1", used: 4 });
  assert.equal(seen.name, "ai_quota_claim");
  assert.deepEqual(seen.args, { p_student: "s1", p_limit: 15, p_mode: "chat", p_lesson: "l1", p_course: "c1", p_session: "x" });
});

test("claimAiQuota: at the limit the function returns claim_id NULL -> claimId null, used = count", async () => {
  const r = await claimAiQuota(rpcDb({ data: [{ claim_id: null, used: 15 }], error: null }), { studentId: "s1", limit: 15, mode: "explain" });
  assert.deepEqual(r, { claimId: null, used: 15 });
});

test("claimAiQuota: optional context defaults to null; rpc error and empty result throw (fail closed)", async () => {
  let args;
  await claimAiQuota({ rpc: async (_n, a) => { args = a; return { data: [{ claim_id: "c", used: 1 }], error: null }; } }, { studentId: "s", limit: 1, mode: "chat" });
  assert.equal(args.p_lesson, null);
  assert.equal(args.p_session, null);
  await assert.rejects(claimAiQuota(rpcDb({ data: null, error: new Error("no function") }), { studentId: "s", limit: 1, mode: "chat" }), /no function/);
  await assert.rejects(claimAiQuota(rpcDb({ data: [], error: null }), { studentId: "s", limit: 1, mode: "chat" }), /no row/);
});

const tableDb = (error) => {
  const calls = [];
  return { calls, from: (t) => ({
    update: (v) => ({ eq: async (c, id) => { calls.push(["update", t, v, c, id]); return { error }; } }),
    delete: () => ({ eq: async (c, id) => { calls.push(["delete", t, c, id]); return { error }; } }),
  }) };
};

test("fillAiClaim updates message + reply of the claim row and throws on error; releaseAiClaim deletes it and never throws", async () => {
  const ok = tableDb(null);
  await fillAiClaim(ok, "c1", { message: "m", reply: "r" });
  assert.deepEqual(ok.calls[0], ["update", "ai_chat_logs", { message: "m", reply: "r" }, "id", "c1"]);
  await assert.rejects(fillAiClaim(tableDb(new Error("boom")), "c1", { message: "m", reply: "r" }), /boom/);
  await releaseAiClaim(ok, "c1");
  assert.deepEqual(ok.calls[1], ["delete", "ai_chat_logs", "id", "c1"]);
  await releaseAiClaim(tableDb({ message: "denied" }), "c1"); // logged, not thrown
});
