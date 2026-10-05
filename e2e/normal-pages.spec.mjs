// The normal course pages never show a tutor set, for a student and for staff. Each check has a positive control
// (the tutor page DOES show the fixture set) so an empty page cannot pass by accident, and a database-level check as the
// signed-in user, because the list pages are paginated / filtered and a UI scan alone could miss a row.
import { test, expect } from "@playwright/test";
import { FX, STATE, restAs } from "./fixtures.mjs";

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
