// Instructor flow: create a tutor set from /i/tutor (the course pages no longer offer it), add a lesson, set the draw
// count, lock the set to one student by email, add a question with a topic to the lesson's bank. The UI generates its
// own ids; the rows are found by the code typed here (UI_CODE_PREFIX) and by the fixture instructor's
// course_instructors link, and removed by global teardown.
import { test, expect } from "@playwright/test";
import XLSX from "xlsx";
import { FX, FX_PREFIX, STATE, UI_CODE_PREFIX, adminDb } from "./fixtures.mjs";
import { TEMPLATE_HEADERS } from "../lib/tutor-import.js";

test.use({ storageState: STATE.instructor });

test("create a tutor set, add a lesson, lock it, add a bank question with a topic", async ({ page }) => {
  const code = UI_CODE_PREFIX + Date.now();
  const title = "[E2E] ชุดติวจากหน้าชุดติว " + code;
  const topic = "E2E หัวข้อใหม่";

  // ---- the course creation page is for courses only ----
  await page.goto("/i/course/new");
  await expect(page.getByPlaceholder("เช่น การพยาบาลผู้ใหญ่ 1")).toBeVisible();
  await expect(page.locator("label", { hasText: "ชุดติว" })).toHaveCount(0);

  // ---- create from the tutor list ----
  await page.goto("/i/tutor");
  await page.getByRole("button", { name: "สร้างชุดติว", exact: true }).click();
  await page.getByPlaceholder("เช่น ติวสอบรวบยอด การพยาบาลผู้ใหญ่ 1").fill(title);
  await page.getByPlaceholder("เช่น NUR301-TUTOR").fill(code);
  await page.getByRole("button", { name: "สร้างและเปิดชุดนี้" }).click();
  await page.waitForURL(/\/i\/tutor\/c_\d+$/);
  const courseId = new URL(page.url()).pathname.split("/").pop();

  const db = adminDb();
  const { data: course, error } = await db.from("courses_all").select("kind, code").eq("id", courseId).single();
  expect(error).toBeNull();
  expect(course).toEqual({ kind: "tutor", code });

  // a new set has no lock: nobody sees it, and the page says so
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("button", { name: "ยังไม่ได้ล็อค ไม่มีนักศึกษาเห็นชุดนี้" })).toBeVisible();

  // ---- add a lesson (in the workspace, no navigation) ----
  await page.locator(".tw-rail").getByRole("button", { name: "เพิ่มบทเรียน" }).click();
  await expect(page.locator(".tw-item")).toHaveCount(1);
  await expect(page.locator(".tw-item").getByText("คลังไม่พอ")).toBeVisible(); // empty bank
  const { data: lessons } = await db.from("lessons").select("id").eq("course_id", courseId);
  expect(lessons).toHaveLength(1);
  const lessonId = lessons[0].id;

  // ---- the course pages hand a tutor set / lesson over to the workspace ----
  await page.goto("/i/course/" + courseId);
  await page.waitForURL(new RegExp(`/i/tutor/${courseId}$`));
  await page.goto("/i/lesson/" + lessonId);
  await page.waitForURL(`**/i/tutor/${courseId}?lesson=${lessonId}`);

  // ---- draw count: the panel warns when the bank is short, then saves ----
  await page.getByLabel("ใช้ทั้งคลัง").uncheck();
  await page.getByLabel("จำนวนข้อต่อรอบ").fill("5");
  await page.getByRole("button", { name: "บันทึกจำนวนข้อ" }).click();
  await expect.poll(async () => (await db.from("lessons").select("tutor_draw_count").eq("id", lessonId).single()).data.tutor_draw_count).toBe(5);

  // ---- lock the set to the fixture student by email ----
  await page.getByRole("button", { name: "ตั้งค่าและการเข้าถึง" }).click();
  await expect(page.getByText("จะไม่มีนักศึกษาเห็นชุดนี้")).toBeVisible(); // the "empty = nobody" wording
  await page.getByRole("button", { name: "เพิ่มนักศึกษา" }).click();
  const picker = page.locator(".dialog");
  await picker.getByPlaceholder("ค้นหา…").fill(FX.student.email);
  await picker.getByText(FX.student.name).click();
  await picker.getByRole("button", { name: "ตกลง" }).click();
  await page.getByRole("button", { name: "บันทึกชุดติว" }).click();
  await expect.poll(async () => (await db.from("courses_all").select("access").eq("id", courseId).single()).data.access.allowedEmails).toEqual([FX.student.email]);
  await expect(page.getByRole("button", { name: "1 อีเมลพิเศษ" })).toBeVisible();

  // ---- the set is on the tutor list (not the course list) ----
  await page.goto("/i/tutor");
  const row = page.locator(".tw-sets-row", { hasText: title });
  await expect(row).toContainText(code);
  await expect(row).toContainText("1 บท");
  await expect(row).toContainText("1 บทคลังไม่พอ");

  // ---- open it, go to the lesson's bank ----
  await row.getByRole("button", { name: /เปิดชุดนี้/ }).click();
  await page.waitForURL(new RegExp(`/i/tutor/${courseId}$`));
  await page.getByRole("button", { name: "เปิดคลังข้อสอบ" }).click();
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

// Excel import into a bank. Own fx_e2e_ course + lesson (the shared fixture lesson feeds the student spec, so its bank must
// not change); removed in finally, and global teardown sweeps anything left by the prefix.
test("import bank questions from an Excel file: preview, errors, untick, topics reused or created", async ({ page }) => {
  const db = adminDb();
  const courseId = FX_PREFIX + "course_import";
  const lessonId = FX_PREFIX + "lesson_import";
  const topicId = FX_PREFIX + "topic_import";
  const ok = (r) => { if (r.error) throw new Error("e2e import seed: " + r.error.message); };
  const sheet = (rows) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...rows]), "ข้อสอบ");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  };

  try {
    ok(await db.from("courses_all").upsert({ id: courseId, code: UI_CODE_PREFIX + "IMPORT", title: "[E2E] นำเข้า Excel", subtitle: "E2E fixture, safe to delete", term: "E2E", year: "2999", instructor: FX.instructor.name, hero: "#0d6e8c", access: { allowedYears: [], allowedEmails: [] }, year_level: [], section: null, kind: "tutor" }));
    ok(await db.from("lessons").upsert({ id: lessonId, course_id: courseId, index: 1, title: "[E2E] บทนำเข้า", description: "E2E fixture lesson", status: "active", tutor_draw_count: null }));
    ok(await db.from("tutor_topics").upsert({ id: topicId, lesson_id: lessonId, name: "E2E Heart" }));

    // [โจทย์, ก, ข, ค, ง, จ, เฉลย, คำอธิบาย, หัวข้อ]; row 5 points at an empty choice, row 6 gets unticked
    const file = sheet([
      ["E2E-IMP-1", "ตัวแรก", "ตัวสอง", "ตัวสาม", "", "", "ข", "E2E-IMP คำอธิบาย", "  e2e heart "],
      ["E2E-IMP-2", "w", "x", "y", "z", "", "C", "", "E2E Import ใหม่"],
      ["E2E-IMP-3", "หนึ่ง", "สอง", "", "", "", 2, "", ""],
      ["E2E-IMP-4 เสีย", "a", "b", "", "", "", "ค", "", ""],
      ["E2E-IMP-5 ไม่นำเข้า", "a", "b", "", "", "", "ก", "", ""],
    ]);

    await page.goto(`/i/lesson/${lessonId}/bank`);
    await expect(page.getByText("คลังข้อสอบ (0 ข้อ · 1 หัวข้อ)")).toBeVisible();
    await page.getByRole("button", { name: "นำเข้าจาก Excel" }).click();
    const dialog = page.locator(".dialog");

    // the template downloads as .xlsx
    const [download] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "ดาวน์โหลดไฟล์ตัวอย่าง" }).click()]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    await dialog.locator("input[type=file]").setInputFiles({ name: "e2e-import.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: file });
    await expect(dialog.getByText("อ่านได้")).toContainText("4");
    await expect(dialog.getByRole("alert")).toContainText("แถว 5: เฉลยชี้ไปที่ตัวเลือก ค ซึ่งว่างอยู่");
    await expect(dialog.locator(".tw-imp-row[data-row]")).toHaveCount(4);

    await dialog.getByLabel("นำเข้าแถว 6").uncheck();
    await dialog.getByRole("button", { name: "นำเข้า 3 ข้อ" }).click();

    await expect(page.getByText("คลังข้อสอบ (3 ข้อ · 2 หัวข้อ)")).toBeVisible();
    await expect(dialog).toHaveCount(0);

    const [{ data: topics }, { data: qs }] = await Promise.all([
      db.from("tutor_topics").select("id, name").eq("lesson_id", lessonId),
      db.from("questions").select("no, text, choices, answer, explanation, topic_id, kind").eq("lesson_id", lessonId).order("no"),
    ]);
    expect(topics).toHaveLength(2); // "e2e heart" reused the existing row, "E2E Import ใหม่" created
    const created = topics.find((t) => t.name === "E2E Import ใหม่");
    expect(created).toBeTruthy();
    expect(qs.map((q) => [q.text, q.kind, q.no])).toEqual([["E2E-IMP-1", "tutor", 1], ["E2E-IMP-2", "tutor", 2], ["E2E-IMP-3", "tutor", 3]]);
    const answerText = (q) => q.choices.find((c) => c.id === q.answer)?.text;
    expect(qs.map(answerText)).toEqual(["ตัวสอง", "y", "สอง"]);
    expect(qs.map((q) => q.choices.length)).toEqual([3, 4, 2]);
    expect(qs.map((q) => q.topic_id)).toEqual([topicId, created.id, null]);
    expect(qs[0].explanation).toBe("E2E-IMP คำอธิบาย");
    expect(new Set(qs.flatMap((q) => q.choices.map((c) => c.id))).size).toBe(9);
  } finally {
    await db.from("questions").delete().eq("lesson_id", lessonId);
    await db.from("tutor_topics").delete().eq("lesson_id", lessonId);
    await db.from("lessons").delete().eq("id", lessonId);
    await db.from("courses_all").delete().eq("id", courseId);
  }
});
