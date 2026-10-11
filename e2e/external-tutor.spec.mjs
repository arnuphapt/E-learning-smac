// External-domain (tutor-only) user: the guest signs in with an allowed domain that is not the school's, so it holds the
// role tutor_guest. It lands on /s/tutor, sees only the tutor sets locked to ITS domain's year level, and is refused
// (page -> redirect, API -> 403) everywhere else.
// Parts that need the migration 20261011040000_tutor_external_domains.sql (student_grades.domain) are skipped until it is applied.
import { test, expect } from "@playwright/test";
import { EXT, FX, STATE, adminDb, externalMigrationApplied, seedExternal } from "./fixtures.mjs";

test.use({ storageState: STATE.guest });
test.describe.configure({ mode: "serial" });

let migrated = false;
test.beforeAll(async () => {
  migrated = await seedExternal(adminDb()); // cleaned by global teardown (cleanFixtures)
});

const landedOnTutor = (page) => expect(page).toHaveURL(/\/s\/tutor$/);

test("sign-in landing (/s/courses) and every other student / instructor page send the guest to /s/tutor", async ({ page }) => {
  for (const url of ["/s/courses", "/s/ai", "/s/assignments", "/s/calendar", "/s/broadcasts", "/s/profile", `/s/course/${FX.course.id}`, "/i/courses", "/i/master/studentgrade"]) {
    await page.goto(url);
    await landedOnTutor(page);
  }
});

test("the navigation offers tutor mode only", async ({ page }) => {
  await page.goto("/s/tutor");
  await expect(page.getByRole("link", { name: "ชุดติว" }).first()).toBeVisible();
  for (const name of ["รายวิชา", "ใบงาน", "ปฏิทิน", "ประกาศ", "AI ผู้ช่วย"]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  }
});

test("APIs outside tutor mode answer 403, and a normal course's files are refused", async ({ page }) => {
  const post = (url, data = {}) => page.request.post(url, { data });
  expect((await post("/api/ai/chat", { messages: [] })).status()).toBe(403);
  expect((await post("/api/ai/history/clear", { sessionId: "x" })).status()).toBe(403);
  expect((await post("/api/tests/submit", {})).status()).toBe(403);
  expect((await post("/api/upload/presign", { filename: "a.pdf", filetype: "application/pdf", folder: `submissions/${FX.guest.id}` })).status()).toBe(403);
  expect((await page.request.get("/api/ai/config")).status()).toBe(403);
  expect((await page.request.get("/api/ai/persona")).status()).toBe(403);
  expect((await page.request.get("/api/tests/result?lessonId=x")).status()).toBe(403);
  expect((await page.request.get("/api/supabase-token")).status()).toBe(403); // no database JWT, ever
  // /api/files is allowed through the proxy (tutor lesson video) but the route itself refuses anything but a tutor set's lesson
  expect((await page.request.get("/api/files?ref=lessons/does-not-exist/video/a.mp4", { maxRedirects: 0 })).status()).toBe(403);
  expect((await page.request.get(`/api/files?ref=submissions/${FX.guest.id}/a.pdf`, { maxRedirects: 0 })).status()).toBe(403);
});

test("year lock by the guest's OWN domain: only the set locked to its year level", async ({ page }) => {
  test.skip(!migrated, "waits for the migration 20261011040000_tutor_external_domains.sql (student_grades.domain)");
  await page.goto("/s/tutor");
  await expect(page.getByText(EXT.own.title)).toBeVisible();
  await expect(page.getByText(EXT.otherYear.title)).toHaveCount(0); // another year level of the same domain
  await expect(page.getByText(EXT.school.title)).toHaveCount(0); // school year 1: a number lock never matches a guest
  await expect(page.getByText(FX.course.title)).toHaveCount(0); // locked by e-mail to the fixture student

  const sets = await (await page.request.get("/api/tutor/sets")).json();
  expect(sets.sets.map((s) => s.id)).toEqual([EXT.own.id]);
  expect((await page.request.get(`/api/tutor/sets/${EXT.own.id}`)).status()).toBe(200);
  for (const id of [EXT.otherYear.id, EXT.school.id, FX.course.id]) {
    expect((await page.request.get(`/api/tutor/sets/${id}`)).status()).toBe(404);
    expect((await page.request.get(`/api/tutor/lessons/${id}_lesson`)).status()).toBe(404);
  }
  expect((await page.request.get(`/api/tutor/lessons/${EXT.own.id}_lesson`)).status()).toBe(200);
});

test("the same prefix and label in another domain is another year level: its key does not open the set", async ({ page }) => {
  test.skip(!migrated, "waits for the migration 20261011040000_tutor_external_domains.sql (student_grades.domain)");
  const db = adminDb();
  await db.from("allowed_domains").upsert({ domain: "fx-e2e-ext2.invalid" });
  // the other domain also has prefix 69 = "E2E ปี 1": a different level (different year_no), the guest's email decides
  const { error } = await db.from("student_grades").upsert({ id: "fx_e2e_sg_other", prefix: "69", year_label: "E2E ปี 1", domain: "fx-e2e-ext2.invalid" });
  expect(error).toBeNull();
  const { data: other } = await db.from("student_grades").select("year_no").eq("id", "fx_e2e_sg_other").single();
  const { data: mine } = await db.from("student_grades").select("year_no").eq("id", EXT.own.grade).single();
  expect(other.year_no).not.toBe(mine.year_no);
  const { data: before } = await db.from("courses_all").select("year_level").eq("id", EXT.otherYear.id).single();
  try {
    await db.from("courses_all").update({ year_level: [other.year_no] }).eq("id", EXT.otherYear.id);
    const ids = (await (await page.request.get("/api/tutor/sets")).json()).sets.map((s) => s.id);
    expect(ids).toEqual([EXT.own.id]); // not otherYear: its lock is the other domain's level
  } finally {
    await db.from("courses_all").update({ year_level: before.year_level }).eq("id", EXT.otherYear.id);
    await db.from("student_grades").delete().eq("id", "fx_e2e_sg_other");
    await db.from("allowed_domains").delete().eq("domain", "fx-e2e-ext2.invalid");
  }
});
