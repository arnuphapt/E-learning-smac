// The normal course pages never show a tutor set, for a student and for staff. Each check has a positive control
// (the tutor page DOES show the fixture set) so an empty page cannot pass by accident, and a database-level check as the
// signed-in user, because the list pages are paginated / filtered and a UI scan alone could miss a row.
import { test, expect } from "@playwright/test";
import { FX, STATE, restAs, adminDb } from "./fixtures.mjs";

const loaded = (page) => expect(page.getByText("กำลังโหลดข้อมูล")).toHaveCount(0);

test.describe("student", () => {
  test.use({ storageState: STATE.student });

  test("/s/courses never lists the tutor set that /s/tutor does", async ({ page }) => {
    await page.goto("/s/tutor");
    await expect(page.getByText(FX.course.title)).toBeVisible(); // control: the fixture student is allowed in

    await page.goto("/s/courses");
    await expect(page.getByRole("heading", { name: "รายวิชาของฉัน" }).or(page.getByText("รายวิชาของฉัน", { exact: true })).first()).toBeVisible();
    await loaded(page);
    await expect(page.getByText(FX.course.title)).toHaveCount(0);
    await expect(page.getByText(FX.course.code)).toHaveCount(0);
  });

  test("a student's database view of courses has no tutor set and courses_all hides it", async ({ page }) => {
    await page.goto("/s/tutor"); // any page of the app: the request context carries the session cookie
    expect((await restAs(page, `courses?select=id&id=eq.${FX.course.id}`)).body).toEqual([]);
    expect((await restAs(page, `courses_all?select=id&id=eq.${FX.course.id}`)).body).toEqual([]); // RLS: students cannot read tutor rows
    expect((await restAs(page, `questions_student?select=id&lesson_id=eq.${FX.lesson.id}`)).body).toEqual([]); // the bank is not readable the old way
  });
});

test.describe("instructor", () => {
  test.use({ storageState: STATE.instructor });

  test("/i/courses never lists the tutor set that /i/tutor does", async ({ page }) => {
    await page.goto("/i/tutor");
    await expect(page.getByText(FX.course.title)).toBeVisible(); // control

    await page.goto("/i/courses");
    await expect(page.getByText("จัดการรายวิชา", { exact: true }).first()).toBeVisible();
    await loaded(page);
    await expect(page.getByText(FX.course.title)).toHaveCount(0);
    await expect(page.getByText(FX.course.code)).toHaveCount(0);
  });

  test("the courses view has no tutor set even for an admin, courses_all has it", async ({ page }) => {
    await page.goto("/i/tutor");
    expect((await restAs(page, `courses?select=id&kind=eq.tutor`)).body).toEqual([]); // not one tutor set, any owner
    expect((await restAs(page, `courses?select=id&id=eq.${FX.course.id}`)).body).toEqual([]);
    expect((await restAs(page, `courses_all?select=id&id=eq.${FX.course.id}`)).body).toEqual([{ id: FX.course.id }]);
  });
});

// Regression: LessonRow used an undeclared `hero`, so every /s/course/<id> with at least one lesson crashed
// ("ReferenceError: hero is not defined" -> "This page couldn't load"). Needs a kind:'course' course WITH a lesson.
const NORMAL = { course: "fx_e2e_normal_course", lesson: "fx_e2e_normal_lesson", title: "[E2E] บทเรียนปกติ" };

test.describe("student normal course page", () => {
  test.use({ storageState: STATE.student });

  test.beforeAll(async () => {
    const db = adminDb(); // fx_e2e_ ids only: global teardown sweeps them too
    const ok = ({ error }) => { if (error) throw new Error("e2e seed normal course: " + error.message); };
    ok(await db.from("courses_all").upsert({
      id: NORMAL.course, code: "FXE2E-NORMAL", title: "[E2E] รายวิชาปกติ", subtitle: "E2E fixture, safe to delete", term: "E2E", year: "2999",
      instructor: FX.instructor.name, hero: "#0d6e8c", access: { allowedYears: [], allowedEmails: [FX.student.email] },
      year_level: [], section: null, kind: "course",
    }));
    ok(await db.from("lessons").upsert({ id: NORMAL.lesson, course_id: NORMAL.course, index: 1, title: NORMAL.title, description: "E2E fixture lesson", status: "active" }));
  });

  test.afterAll(async () => {
    const db = adminDb();
    await db.from("lessons").delete().eq("id", NORMAL.lesson);
    await db.from("courses_all").delete().eq("id", NORMAL.course);
  });

  test("/s/course/<id> renders its lesson without a page error", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/s/course/${NORMAL.course}`);
    await expect(page.getByText(NORMAL.title)).toBeVisible();
    await expect(page.getByText("This page couldn’t load")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
