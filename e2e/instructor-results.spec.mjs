// Instructor results tab of a tutor set: seeded attempts (own fx_e2e_ course / lesson / students, the shared fixture lesson feeds the
// student spec so it is left alone) show up as overview + student table + side panel, and the Excel export downloads a file with them.
// Everything is removed in finally; global teardown also sweeps every fx_e2e_ user, attempt, lesson and course by prefix.
import { test, expect } from "@playwright/test";
import XLSX from "xlsx";
import { FX, FX_PREFIX, STATE, UI_CODE_PREFIX, adminDb } from "./fixtures.mjs";
import { buildResult } from "../lib/tutor-analysis.js";

test.use({ storageState: STATE.instructor });

const P = FX_PREFIX + "res_";
const ID = { course: P + "course", lesson: P + "lesson", topicA: P + "topic_a", topicB: P + "topic_b", gone: P + "q_gone", s1: P + "s1", s2: P + "s2", s3: P + "s3" };
const q = (n) => P + "q" + n;
const NAME = { s1: "E2E นักศึกษา ก", s2: "E2E นักศึกษา ข" };

// A round over [q1 (topic A), q2 (topic A), q3 (topic B), gone (deleted question)]; `right` = questions answered correctly.
function round(right) {
  const ids = [q(1), q(2), q(3), ID.gone];
  const rows = ids.map((id) => ({ question_id: id, chosen: right.includes(id) ? "a" : "b", correct: right.includes(id), unanswered: false }));
  const keys = [1, 2, 3].map((n) => ({ id: q(n), answer: "a", topic_id: n <= 2 ? ID.topicA : ID.topicB }));
  const topics = [{ id: ID.topicA, name: "E2E หัวใจ" }, { id: ID.topicB, name: "E2E ไต" }];
  return { ids, score: right.length, result: buildResult({ rows, keys, topics, lessonName: "E2E บท" }) };
}

const attempt = (r, student, startedAt, over = {}) => ({
  student_id: student,
  lesson_id: ID.lesson,
  question_ids: r.ids,
  total: 4,
  started_at: startedAt,
  deadline_at: new Date(Date.parse(startedAt) + 4 * 60_000).toISOString(),
  status: "submitted",
  score: r.score,
  submitted_at: new Date(Date.parse(startedAt) + 3 * 60_000).toISOString(),
  result: r.result,
  ...over,
});

test("results tab: overview, student table, side panel with a round's review, Excel export", async ({ page }) => {
  const db = adminDb();
  const ok = (r) => { if (r.error) throw new Error("e2e results seed: " + r.error.message); };
  try {
    ok(await db.from("users").upsert([
      { id: ID.s1, name: NAME.s1, email: ID.s1 + "@e2e.invalid", role: "student", student_no: "650001" },
      { id: ID.s2, name: NAME.s2, email: ID.s2 + "@e2e.invalid", role: "student", student_no: "650002" },
      { id: ID.s3, name: "E2E นักศึกษา ค", email: ID.s3 + "@e2e.invalid", role: "student", student_no: "650003" },
    ]));
    ok(await db.from("courses_all").upsert({ id: ID.course, code: UI_CODE_PREFIX + "RESULTS", title: "[E2E] ผลการทำข้อสอบ", subtitle: "E2E fixture, safe to delete", term: "E2E", year: "2999", instructor: FX.instructor.name, hero: "#0d6e8c", access: { allowedYears: [], allowedEmails: [] }, year_level: [], section: null, kind: "tutor" }));
    ok(await db.from("lessons").upsert({ id: ID.lesson, course_id: ID.course, index: 1, title: "[E2E] บทผลคะแนน", description: "E2E fixture lesson", status: "active", tutor_draw_count: null }));
    ok(await db.from("tutor_topics").upsert([{ id: ID.topicA, lesson_id: ID.lesson, name: "E2E หัวใจ" }, { id: ID.topicB, lesson_id: ID.lesson, name: "E2E ไต" }]));
    ok(await db.from("questions").upsert([1, 2, 3].map((n) => ({
      id: q(n), no: n, type: "single", text: `E2E-RES-${n} โจทย์`, choices: [{ id: "a", text: `E2E-RES-${n} ถูก` }, { id: "b", text: `E2E-RES-${n} ผิด` }],
      answer: "a", explanation: "", lesson_id: ID.lesson, kind: "tutor", topic_id: n <= 2 ? ID.topicA : ID.topicB,
    }))));

    // s1: 1/4 then 3/4 (best); s2: 2/4; s3 is still in progress (counted, never scored)
    const open = { status: "in_progress", score: null, submitted_at: null, result: null };
    ok(await db.from("tutor_attempts").insert([
      attempt(round([q(1)]), ID.s1, "2026-10-01T03:00:00Z"),
      attempt(round([q(1), q(2), ID.gone]), ID.s1, "2026-10-02T03:00:00Z"),
      attempt(round([q(1), q(3)]), ID.s2, "2026-10-02T04:00:00Z"),
      { ...attempt(round([]), ID.s3, new Date().toISOString(), open), deadline_at: new Date(Date.now() + 3_600_000).toISOString() },
    ]));

    await page.goto("/i/tutor/" + ID.course);
    await page.getByRole("button", { name: "ผลการทำข้อสอบ" }).click();

    // ---- overview: 2 students, 3 ended rounds, mean of BEST percents (75 + 50) / 2 = 63, 1 running round ----
    const fig = (label) => page.locator(".tw-figs > div", { hasText: label }).locator("dd");
    await expect(fig("นักศึกษาที่ทำแล้ว")).toHaveText(/^2/);
    await expect(fig("จำนวนรอบทั้งหมด")).toHaveText(/^3/);
    await expect(fig("เฉลี่ยคะแนนดีที่สุด")).toHaveText(/^63/);
    await expect(fig("กำลังทำอยู่")).toHaveText(/^1/);

    // ---- class topics from the best rounds: A 3/4, B 1/2, untagged 1/2 ----
    await expect(page.locator(".tw-bar-row", { hasText: "E2E หัวใจ" })).toContainText("75%");
    await expect(page.locator(".tw-bar-row", { hasText: "E2E ไต" })).toContainText("50%");

    // ---- student table: weakest best score first; the in-progress student is not listed ----
    const rows = page.locator("button.tw-res-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(NAME.s2);
    await expect(rows.nth(0)).toContainText("2/4 · 50%");
    await expect(rows.nth(1)).toContainText(NAME.s1);
    await expect(rows.nth(1)).toContainText("650001");
    await expect(rows.nth(1)).toContainText("3/4 · 75%");
    await expect(page.getByText("E2E นักศึกษา ค")).toHaveCount(0);

    // ---- side panel: rounds, best marked, review of the chosen round, a deleted question ----
    await rows.nth(1).click();
    const panel = page.getByRole("dialog");
    await expect(panel).toContainText(NAME.s1);
    await expect(panel.locator(".tw-rounds button")).toHaveCount(2);
    await expect(panel.locator(".tw-rounds button.on")).toContainText("รอบที่ 2");
    await expect(panel.locator(".tw-rounds button.on")).toContainText("ดีที่สุด");
    await expect(panel.getByText("E2E-RES-1 โจทย์")).toBeVisible();
    await expect(panel.getByText("ข้อนี้ถูกลบแล้ว")).toBeVisible();
    await expect(panel.locator(".tw-q")).toHaveCount(4);
    await expect(panel.locator(".badge-danger", { hasText: "ตอบผิด" })).toHaveCount(1); // round 2: only q3 is wrong
    await panel.locator(".tw-rounds button", { hasText: "รอบที่ 1" }).click();
    await expect(panel.locator(".badge-danger", { hasText: "ตอบผิด" })).toHaveCount(3); // round 1: q2, q3 and the deleted question are wrong
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);

    // ---- export: the lesson as .xlsx with best score, rounds and a % column per topic ----
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "ส่งออกบทนี้" }).click()]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    const wb = XLSX.readFile(await download.path());
    expect(wb.SheetNames).toEqual(["บทที่ 1"]);
    const out = XLSX.utils.sheet_to_json(wb.Sheets["บทที่ 1"]);
    expect(out).toHaveLength(2);
    const s1 = out.find((r) => r["ชื่อ-นามสกุล"] === NAME.s1);
    expect(s1).toMatchObject({ "รหัสนักศึกษา": "650001", "จำนวนรอบ": 2, "คะแนนดีที่สุด": 3, "เต็ม": 4, "ร้อยละ": 75, "หัวข้อ: E2E หัวใจ": 100, "หัวข้อ: E2E ไต": 0 });
  } finally {
    await db.from("tutor_attempts").delete().eq("lesson_id", ID.lesson);
    await db.from("questions").delete().eq("lesson_id", ID.lesson);
    await db.from("tutor_topics").delete().eq("lesson_id", ID.lesson);
    await db.from("lessons").delete().eq("id", ID.lesson);
    await db.from("courses_all").delete().eq("id", ID.course);
    await db.from("users").delete().like("id", P + "%");
  }
});
