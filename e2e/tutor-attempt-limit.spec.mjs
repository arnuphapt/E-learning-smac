// Once-only tutor lessons (lessons.tutor_max_attempts = 1): the second start is refused (409 state "limit"), an open round is
// resumed, two simultaneous first starts create ONE round, and the student screens show the used-up state.
// Needs the migration 20261011050000_tutor_attempt_limit.sql (lessons.tutor_max_attempts + the guard trigger): the whole file is
// skipped until it is applied. The extra lessons are deleted again in afterAll (the fixture set is shared with the other specs). NOTE: until it is applied the tutor APIs of every other spec also answer 500 (they select the column).
import { test, expect } from "@playwright/test";
import { FX, STATE, adminDb } from "./fixtures.mjs";

test.use({ storageState: STATE.student });
test.describe.configure({ mode: "serial" });

const ONCE = { id: "fx_e2e_lesson_once", title: "[E2E] บทครั้งเดียว", index: 2 };
const RACE = { id: "fx_e2e_lesson_race", title: "[E2E] บทแข่งกันเริ่ม", index: 3 };
const attemptUrl = (id) => `/api/tutor/lessons/${id}/attempt`;

let migrated = false;
test.beforeAll(async () => {
  const db = adminDb(); // rows are removed by global teardown (cleanFixtures: lessons of the fixture course, their questions and attempts)
  migrated = !(await db.from("lessons").select("tutor_max_attempts").limit(1)).error;
  if (!migrated) return;
  for (const l of [ONCE, RACE]) {
    const must = ({ error }, what) => { if (error) throw new Error(`e2e: ${what}: ${error.message}`); };
    must(await db.from("lessons").upsert({ id: l.id, course_id: FX.course.id, index: l.index, title: l.title, description: "E2E fixture lesson", status: "active", tutor_draw_count: null, tutor_max_attempts: 1 }), "seed once-only lesson");
    must(await db.from("questions").upsert([1, 2].map((n) => ({
      id: `${l.id}_q${n}`, no: n, type: "single", text: `E2E-${l.id}-${n}`, kind: "tutor", lesson_id: l.id, answer: "a",
      choices: [{ id: "a", text: "ถูก" }, { id: "b", text: "ผิด" }],
    }))), "seed once-only questions");
  }
});
// the fixture set is shared with the other specs (lesson counts): remove this spec's extra lessons right away
test.afterAll(async () => {
  if (!migrated) return;
  const db = adminDb();
  const lessonIds = [ONCE.id, RACE.id];
  await db.from("tutor_attempts").delete().in("lesson_id", lessonIds); // answers go with them (ON DELETE CASCADE)
  await db.from("questions").delete().in("lesson_id", lessonIds);
  await db.from("lessons").delete().in("id", lessonIds);
});
test.beforeEach(() => test.skip(!migrated, "waits for the migration 20261011050000_tutor_attempt_limit.sql (lessons.tutor_max_attempts)"));

test("a once-only lesson: start, resume the open round, submit, then the next start is refused", async ({ page }) => {
  const pre = await (await page.request.get(attemptUrl(ONCE.id))).json();
  expect(pre.limit).toBe(1);
  expect(pre.canStart).toBe(true);

  const first = await page.request.post(attemptUrl(ONCE.id), { data: {} });
  expect(first.status()).toBe(200);
  const { attempt } = await first.json();
  expect(attempt.resumed).toBe(false);

  const again = await page.request.post(attemptUrl(ONCE.id), { data: {} }); // an open round is resumed, never refused
  expect(again.status()).toBe(200);
  expect((await again.json()).attempt.id).toBe(attempt.id);

  expect((await page.request.post(`/api/tutor/attempts/${attempt.id}/submit`)).status()).toBe(200);

  const refused = await page.request.post(attemptUrl(ONCE.id), { data: {} });
  expect(refused.status()).toBe(409);
  expect(await refused.json()).toEqual({ error: "บทนี้ทำได้ครั้งเดียว และทำไปแล้ว", state: "limit" });
  const after = await (await page.request.get(attemptUrl(ONCE.id))).json();
  expect(after.canStart).toBe(false);
});

test("student screens: badge on the set, 'ทำไปแล้ว' (disabled) on the lesson, result still reachable", async ({ page }) => {
  await page.goto(`/s/tutor/${FX.course.id}`);
  await expect(page.getByText("ทำได้ครั้งเดียว").first()).toBeVisible();
  await page.goto(`/s/tutor/lesson/${ONCE.id}`);
  await expect(page.getByRole("button", { name: "ทำไปแล้ว" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "ดูผลของฉัน" })).toBeEnabled();
  await page.goto(`/s/tutor/lesson/${ONCE.id}/exam`);
  await expect(page.getByRole("button", { name: "ทำไปแล้ว" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "เริ่มทำข้อสอบ" })).toHaveCount(0);
});

test("two simultaneous first starts of a once-only lesson create exactly one round", async ({ page }) => {
  const [a, b] = await Promise.all([page.request.post(attemptUrl(RACE.id), { data: {} }), page.request.post(attemptUrl(RACE.id), { data: {} })]);
  expect([a.status(), b.status()]).toEqual([200, 200]); // the loser gets the winner's round back
  expect((await a.json()).attempt.id).toBe((await b.json()).attempt.id);
  const { count } = await adminDb().from("tutor_attempts").select("*", { count: "exact", head: true }).eq("student_id", FX.student.id).eq("lesson_id", RACE.id);
  expect(count).toBe(1);
});
