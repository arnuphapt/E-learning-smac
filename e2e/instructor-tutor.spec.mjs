// Instructor flow: create a tutor set from the existing create-course page (the "ชุดติว" checkbox), add a lesson, add a
// question with a topic to the lesson's bank. The UI generates its own ids; the rows are found by the code typed here
// (UI_CODE_PREFIX) and by the fixture instructor's course_instructors link, and removed by global teardown.
import { test, expect } from "@playwright/test";
import { FX, STATE, UI_CODE_PREFIX, adminDb } from "./fixtures.mjs";

test.use({ storageState: STATE.instructor });

test("create a tutor set, add a lesson, add a bank question with a topic", async ({ page }) => {
  const code = UI_CODE_PREFIX + Date.now();
  const title = "[E2E] ชุดติวจากหน้าสร้าง " + code;
  const topic = "E2E หัวข้อใหม่";

  // ---- create from the existing course page ----
  await page.goto("/i/course/new");
  await page.getByPlaceholder("เช่น การพยาบาลผู้ใหญ่ 1").fill(title);
  await page.getByPlaceholder("เช่น NUR301").fill(code);
  await page.locator("label", { hasText: "ชุดติว" }).getByRole("checkbox").check();
  await page.getByRole("button", { name: "สร้างรายวิชา" }).click();
  await page.waitForURL(/\/i\/course\/c_\d+$/); // a tutor set goes straight to its edit page
  const courseId = new URL(page.url()).pathname.split("/").pop();

  const { data: course, error } = await adminDb().from("courses_all").select("kind, code").eq("id", courseId).single();
  expect(error).toBeNull();
  expect(course).toEqual({ kind: "tutor", code });

  // ---- add a lesson ----
  await expect(page.getByRole("heading", { name: title }).or(page.getByText(title).first()).first()).toBeVisible();
  await page.getByRole("button", { name: "เพิ่มบทเรียน", exact: true }).click();
  await page.waitForURL(/\/i\/lesson\/l_\d+$/);
  const lessonId = new URL(page.url()).pathname.split("/").pop();

  // ---- the set is on the tutor list (not the course list) and its lesson links to the bank ----
  await page.goto("/i/tutor");
  const card = page.locator(".card", { has: page.getByText(title, { exact: true }) }).last();
  await expect(card.getByText(`${code} · 1 บท`)).toBeVisible();
  await card.getByRole("button", { name: "คลังข้อสอบ" }).click();
  await page.waitForURL(`**/i/lesson/${lessonId}/bank`);

  // ---- add a bank question with a topic ----
  await expect(page.getByText("คลังข้อสอบ (0 ข้อ · 0 หัวข้อ)")).toBeVisible();
  await page.getByRole("button", { name: "เพิ่มข้อสอบ", exact: true }).click();
  const dialog = page.locator(".dialog");
  await dialog.getByPlaceholder("พิมพ์โจทย์คำถาม…").fill("E2E ข้อสอบที่เพิ่มโดยอาจารย์");
  await dialog.getByPlaceholder("ตัวเลือก A").fill("E2E คำตอบถูก");
  await dialog.getByPlaceholder("ตัวเลือก B").fill("E2E คำตอบผิด");
  await dialog.getByPlaceholder("อธิบายว่าทำไมข้อนี้ถึงเป็นคำตอบที่ถูก…").fill("E2E คำอธิบายเฉลย");
  await dialog.getByPlaceholder("เช่น ภาวะหัวใจล้มเหลว").fill(topic);
  await dialog.getByRole("button", { name: "บันทึกข้อสอบ" }).click();

  await expect(page.getByText("คลังข้อสอบ (1 ข้อ · 1 หัวข้อ)")).toBeVisible();
  await expect(page.getByText("E2E ข้อสอบที่เพิ่มโดยอาจารย์")).toBeVisible();
  await expect(page.getByText(topic, { exact: true })).toBeVisible();

  const db = adminDb();
  const [{ data: topics }, { data: questions }] = await Promise.all([
    db.from("tutor_topics").select("id, name").eq("lesson_id", lessonId),
    db.from("questions").select("kind, answer, topic_id, explanation").eq("lesson_id", lessonId),
  ]);
  expect(topics).toHaveLength(1);
  expect(topics[0].name).toBe(topic);
  expect(questions).toEqual([{ kind: "tutor", answer: "a", topic_id: topics[0].id, explanation: "E2E คำอธิบายเฉลย" }]);

  // ---- and the normal course list never shows it ----
  await page.goto("/i/courses");
  await expect(page.getByText("จัดการรายวิชา", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("กำลังโหลดข้อมูล")).toHaveCount(0);
  await expect(page.getByText(code)).toHaveCount(0);
  await expect(page.getByText(FX.course.code)).toHaveCount(0);
});
