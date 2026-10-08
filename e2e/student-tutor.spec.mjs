// Student flow of tutor mode on the hidden fixture set: start -> answer -> disconnect -> resume -> submit -> result,
// plus the explain gate. Gemini is real but called as little as possible: the summary once (result page, then stored on
// the attempt) and "ถาม AI" once. The tests share one attempt, so they run in order.
import { test, expect } from "@playwright/test";
import { FX, STATE, adminDb, choiceText, explanationText, questionText } from "./fixtures.mjs";

test.use({ storageState: STATE.student });
test.describe.configure({ mode: "serial" });

const examUrl = `/s/tutor/lesson/${FX.lesson.id}/exam`;
const resultUrl = `/s/tutor/lesson/${FX.lesson.id}/result`;
const isAttemptPost = (r) => r.request().method() === "POST" && new URL(r.url()).pathname === `/api/tutor/lessons/${FX.lesson.id}/attempt`;
const isAnswerPost = (r) => r.request().method() === "POST" && /\/api\/tutor\/attempts\/[^/]+\/answer$/.test(new URL(r.url()).pathname);

const numberOf = (q) => Number(q.text.match(/^E2E-(\d)/)[1]);
// questions 1-3 are answered right, question 4 wrong: 3/4, topic A 100%, topic B 50%
const idFor = (q) => (numberOf(q) !== 4 ? "a" : "b");
const labelFor = (q) => choiceText(numberOf(q), numberOf(q) !== 4);

async function pick(page, q) {
  const saved = page.waitForResponse(isAnswerPost);
  await page.getByRole("button", { name: labelFor(q), exact: true }).click();
  const res = await saved;
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true, applied: true });
}

const secondsLeft = async (page) => {
  const [m, s] = (await page.locator('[aria-label="เวลาที่เหลือ"]').innerText()).trim().split(":").map(Number);
  return m * 60 + s;
};

let attemptId;

test("start, answer, lose the connection, resume the same round, submit", async ({ page, context }) => {
  // ---- start ----
  await page.goto(examUrl);
  await expect(page.getByText("4 ข้อ", { exact: true })).toBeVisible();
  await expect(page.getByText("4 นาที", { exact: true })).toBeVisible();
  const started = page.waitForResponse(isAttemptPost);
  await page.getByRole("button", { name: "เริ่มทำข้อสอบ" }).click();
  const start = await (await started).json();
  attemptId = start.attempt.id;
  const qs = start.questions;
  expect(qs).toHaveLength(4);
  expect(start.attempt.resumed).toBe(false);
  // the exam payload never carries the key, the explanation or the topic
  for (const q of qs) expect(Object.keys(q).sort()).toEqual(["choices", "id", "text", "type"]);
  expect(JSON.stringify(start)).not.toContain("คำอธิบายของอาจารย์");

  await expect(page.getByText(qs[0].text)).toBeVisible();
  await pick(page, qs[0]);
  await page.getByRole("button", { name: "ข้อถัดไป" }).click();
  await pick(page, qs[1]);
  await page.getByRole("button", { name: "ข้อถัดไป" }).click();
  await expect(page.getByText(qs[2].text)).toBeVisible();
  await expect(page.getByText("ตอบแล้ว 2/4")).toBeVisible();

  // ---- explain gate, before submit: refused, nothing revealed ----
  const early = await page.request.post(`/api/tutor/attempts/${attemptId}/explain`, {
    data: { questionId: qs[0].id, messages: [{ role: "user", content: "ช่วยอธิบายข้อนี้ให้หน่อย" }] },
  });
  expect(early.status()).toBe(409);
  expect(await early.json()).toEqual({ state: "in_progress" });
  const earlyResult = await page.request.get(`/api/tutor/lessons/${FX.lesson.id}/result?attempt=${attemptId}`);
  expect(earlyResult.status()).toBe(409);
  expect(await earlyResult.text()).not.toContain("คำอธิบายของอาจารย์");
  expect((await page.request.post(`/api/tutor/attempts/${attemptId}/summary`)).status()).toBe(409);

  // ---- connection lost: the click is not saved, the page says so ----
  await context.setOffline(true);
  await page.getByRole("button", { name: labelFor(qs[2]), exact: true }).click();
  await expect(page.getByText("บันทึกคำตอบไม่สำเร็จ")).toBeVisible();
  await expect(page.getByText("ตอบแล้ว 2/4")).toBeVisible(); // rolled back to what the server confirmed
  await page.close();
  await context.setOffline(false);

  // ---- come back: same round, same question. The device clock is an hour ahead: the timer must follow the server ----
  const page2 = await context.newPage();
  await page2.clock.setFixedTime(Date.now() + 60 * 60 * 1000);
  const resumedRes = page2.waitForResponse(isAttemptPost);
  await page2.goto(examUrl);
  const resumed = await (await resumedRes).json();
  expect(resumed.attempt.id).toBe(attemptId);
  expect(resumed.attempt.resumed).toBe(true);
  expect(resumed.questions.map((q) => q.id)).toEqual(qs.map((q) => q.id)); // locked set and order
  expect(resumed.answers).toEqual({ [qs[0].id]: idFor(qs[0]), [qs[1].id]: idFor(qs[1]) }); // saved on the server, nothing else
  expect(resumed.attempt.deadlineAt).toBe(start.attempt.deadlineAt); // the deadline was never extended
  await expect(page2.getByText(qs[2].text)).toBeVisible();
  await expect(page2.getByText("ข้อ 3 จาก 4")).toBeVisible();
  await expect(page2.getByText("ตอบแล้ว 2/4")).toBeVisible();
  expect((await page2.evaluate(() => Date.now())) - Date.now()).toBeGreaterThan(59 * 60 * 1000); // the skew really is in the page
  const expected = Math.round((Date.parse(resumed.attempt.deadlineAt) - Date.parse(resumed.serverNow)) / 1000);
  expect(Math.abs((await secondsLeft(page2)) - expected)).toBeLessThanOrEqual(3); // a client-clock timer would read 00:00

  // ---- finish and submit ----
  await pick(page2, qs[2]);
  await page2.getByRole("button", { name: "ข้อถัดไป" }).click();
  await pick(page2, qs[3]);
  await expect(page2.getByText("ตอบแล้ว 4/4")).toBeVisible();
  await page2.getByRole("button", { name: "ส่งคำตอบ", exact: true }).click();
  await page2.locator(".dialog").getByRole("button", { name: "ส่งคำตอบ", exact: true }).click();
  await expect(page2.getByText("ส่งคำตอบแล้ว")).toBeVisible();
  await expect(page2.getByLabel("คะแนนรวม")).toHaveText(/3\s*\/\s*4/);
  await page2.close();
});

test("result page: score, topic analysis, AI summary generated once, review", async ({ page }) => {
  expect(attemptId, "needs the attempt of the previous test").toBeTruthy();
  const summaryCalls = [];
  page.on("request", (r) => r.method() === "POST" && r.url().endsWith("/summary") && summaryCalls.push(r.url()));

  await page.goto(resultUrl);
  await expect(page.getByLabel("คะแนนรวม")).toHaveText(/3\s*\/\s*4\s*\(75%\)/);
  await expect(page.getByText("รอบที่ดีที่สุด")).toBeVisible();

  // per-topic bars (topic A 2/2, topic B 1/2) and the topics to review
  await expect(page.getByText(FX.topics[0].name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("ถูก 2/2 ข้อ · 100%")).toBeVisible();
  await expect(page.getByText("ถูก 1/2 ข้อ · 50%")).toBeVisible();
  await expect(page.getByText("ตอบถูก 1 จาก 2 ข้อ (50%) ต่ำกว่าเกณฑ์ 60%")).toBeVisible();

  // review: 3 right, 1 wrong, the teacher's explanation on every item, "ถาม AI" on every item
  await expect(page.getByText("ตอบถูก", { exact: true })).toHaveCount(3);
  await expect(page.getByText("ตอบผิด", { exact: true })).toHaveCount(1);
  await expect(page.getByText("ไม่ได้ตอบ", { exact: true })).toHaveCount(0);
  for (const n of [1, 2, 3, 4]) {
    await expect(page.getByText(questionText(n), { exact: true })).toBeVisible();
    await expect(page.getByText(explanationText(n), { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "ถาม AI" })).toHaveCount(4);

  // AI summary: generated by the first open (one Gemini call), then stored on the attempt
  await expect(page.getByText("AI กำลังสรุปผลของคุณ")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByText("ยังสรุปด้วย AI ไม่ได้")).toHaveCount(0);
  await expect(page.getByText("AI กำลังสรุปผลอยู่")).toHaveCount(0);
  const { data: stored, error } = await adminDb().from("tutor_attempts").select("status, score, summary").eq("id", attemptId).single();
  expect(error).toBeNull();
  expect(stored.status).toBe("submitted");
  expect(stored.score).toBe(3);
  expect(stored.summary?.version).toBe(1);
  expect(stored.summary.overview.length).toBeGreaterThan(0);
  await expect(page.getByText(stored.summary.overview.slice(0, 20))).toBeVisible();
  expect(summaryCalls).toHaveLength(1);

  // opening again reads it from storage: no further summary call
  summaryCalls.length = 0;
  await page.reload();
  await expect(page.getByText(stored.summary.overview.slice(0, 20))).toBeVisible();
  expect(summaryCalls).toHaveLength(0);
});

test("explain gate after submit: unknown question refused, ถาม AI answers once", async ({ page }) => {
  expect(attemptId, "needs the attempt of the first test").toBeTruthy();
  // a question that is not in the attempt looks like a missing one (no Gemini call)
  const foreign = await page.request.post(`/api/tutor/attempts/${attemptId}/explain`, {
    data: { questionId: "fx_e2e_not_in_attempt", messages: [{ role: "user", content: "x" }] },
  });
  expect(foreign.status()).toBe(404);

  await page.goto(resultUrl);
  const item = page.locator(".clay-card", { has: page.getByText(questionText(4), { exact: true }) }).last();
  await item.getByRole("button", { name: "ถาม AI" }).click();
  const answered = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith(`/api/tutor/attempts/${attemptId}/explain`));
  await item.getByRole("button", { name: "ส่ง", exact: true }).click();
  const res = await answered;
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.reply.length).toBeGreaterThan(0);
  expect(body.rateLimitInfo.used).toBe(1);
  await expect(item.getByText("AI ตอบไม่สำเร็จ")).toHaveCount(0);
  await expect(item.getByText(body.reply.slice(0, 15))).toBeVisible();

  // exactly one explain log row for the fixture student: this is what the shared daily quota counts
  const { data: logs, error } = await adminDb().from("ai_chat_logs").select("mode, reply").eq("student_id", FX.student.id).eq("mode", "explain");
  expect(error).toBeNull();
  expect(logs).toHaveLength(1);
  expect(logs[0].reply.length).toBeGreaterThan(0);
});
