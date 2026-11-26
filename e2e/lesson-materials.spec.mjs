// UI checks use an in-memory PostgREST substitute. Database/RLS copy behavior is verified separately on DEV.
import { test, expect } from "@playwright/test"
import dotenv from "dotenv"
import * as nextAuthJwt from "next-auth/jwt"
import os from "node:os"
import path from "node:path"

dotenv.config({ path: ".env.local", quiet: true })
const encode = nextAuthJwt.encode ?? nextAuthJwt.default.encode
const user = { id: "material-ui-test", name: "Material UI", email: "material-ui@example.invalid", role: "admin", permissions: ["courses:view", "master:manage"] }

async function setup(page, baseURL) {
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 3600, token: { sub: user.id, dbId: user.id, role: user.role, name: user.name, email: user.email } })
  await page.context().addCookies([{ name: "next-auth.session-token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }])
  await page.route("**/api/auth/session", (r) => r.fulfill({ json: { user, dbId: user.id, expires: new Date(Date.now() + 3600000).toISOString() } }))
  await page.route("**/api/supabase-token", (r) => r.fulfill({ json: { token: "ui-only-token", sub: user.id, exp: Date.now() / 1000 + 3600 } }))
  const payload = {
    config: { required: false, passing_score: 60, time_limit: 20, attempts: "1", shuffle: true, show_answers: true },
    questions: [{ text: "โจทย์จาก Master", type: "single", choices: [{ id: "a", text: "ถูก" }, { id: "b", text: "ผิด" }], answer: "a" }],
    worksheet: { instructions: "วิเคราะห์กรณีศึกษา", allow_file: true, allow_text: true, allow_late: false, criteria: [{ id: "c1", name: "การวิเคราะห์", max: 10 }] },
  }
  const templates = ["pre", "post", "assignment"].map((kind, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, title: `ต้นแบบ ${kind}`, kind, payload: structuredClone(payload), created_at: new Date().toISOString() }))
  const lesson = { id: "material-lesson", course_id: "material-course", title: "บทเรียนทดสอบ Master", index: 1, status: "draft", description: "", has_docs: false, has_pretest: true, has_posttest: true, has_assignment: true, allow_ai: false, watch_limit: false, documents: [], pretest: payload.config, posttest: payload.config }
  const questions = []
  const assignments = []
  const rubrics = []
  const copies = []
  await page.route("**/rest/v1/**", async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const table = url.pathname.split("/").at(-1)
    const body = req.method() === "POST" || req.method() === "PATCH" ? req.postDataJSON() : null
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS" }
    const respond = (json) => route.fulfill({ json, headers })
    if (req.method() === "OPTIONS") return respond({})
    if (table === "lesson_material_templates") {
      if (req.method() === "POST") {
        const row = { ...(Array.isArray(body) ? body[0] : body), id: crypto.randomUUID(), created_at: new Date().toISOString() }
        templates.push(row)
        return respond(row)
      }
      if (req.method() === "PATCH") {
        const row = templates.find((t) => `eq.${t.id}` === url.searchParams.get("id"))
        Object.assign(row, body)
        return respond(row)
      }
      return respond(templates.filter((t) => !url.searchParams.get("kind") || `eq.${t.kind}` === url.searchParams.get("kind")))
    }
    if (table === "copy_lesson_material") {
      copies.push(body)
      const t = templates.find((t) => t.id === body.p_template)
      if (t.kind === "assignment") {
        const rubricId = crypto.randomUUID()
        rubrics.push({ id: rubricId, title: t.title, criteria: structuredClone(t.payload.worksheet.criteria) })
        assignments.push({ id: crypto.randomUUID(), title: t.title, instructions: t.payload.worksheet.instructions, lesson_id: lesson.id, course_id: lesson.course_id, rubric_id: rubricId, due: body.p_due, due_time: body.p_due_time, points: 10 })
      } else {
        questions.push(...structuredClone(t.payload.questions).map((q, i) => ({ ...q, id: crypto.randomUUID(), lesson_id: lesson.id, kind: t.kind, no: i + 1 })))
        lesson[t.kind === "pre" ? "pretest" : "posttest"] = structuredClone(t.payload.config)
      }
      return respond(lesson.id)
    }
    if (table === "lessons") {
      if (body) Object.assign(lesson, body)
      return respond(lesson)
    }
    if (table === "courses_all") return respond({ id: lesson.course_id, title: "รายวิชาทดสอบ", code: "TEST", kind: "course" })
    return respond(({ questions, assignments, rubrics })[table] ?? [])
  })
  return { copies, templates, questions, lesson }
}

test("create pre/post masters and reject empty question banks", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL)
  for (const [path, label] of [["pretests", "แบบทดสอบก่อนเรียน"], ["posttests", "แบบทดสอบหลังเรียน"]]) {
    await page.goto(`/i/master/${path}`)
    await expect(page.getByRole("heading", { name: `คลัง${label}`, exact: true })).toBeVisible()
    await page.getByRole("button", { name: "สร้างต้นแบบ", exact: true }).click()
    await page.getByLabel(/^ชื่อต้นแบบ/).fill(`ชุดใหม่ ${label}`)
    await page.getByRole("button", { name: "บันทึกต้นแบบ", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("กรุณาเพิ่มคำถาม")
    await page.getByRole("button", { name: "เพิ่มคำถาม", exact: true }).click()
    await page.getByLabel("โจทย์คำถาม", { exact: true }).fill(`คำถาม ${label}`)
    await page.getByRole("textbox", { name: "ตัวเลือก A", exact: true }).fill("คำตอบ A")
    await page.getByRole("textbox", { name: "ตัวเลือก B", exact: true }).fill("คำตอบ B")
    await page.getByRole("button", { name: "บันทึกข้อสอบ", exact: true }).click()
    await page.getByRole("button", { name: "บันทึกต้นแบบ", exact: true }).click()
    await expect(page.getByText(`ชุดใหม่ ${label}`, { exact: true })).toBeVisible()
  }
  expect(state.templates).toHaveLength(5)
  expect(state.templates[3].payload.config).not.toHaveProperty("due")
})

test("create worksheet master with instructions and rubric", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL)
  await page.goto("/i/master/worksheets")
  await page.getByRole("button", { name: "สร้างต้นแบบ", exact: true }).click()
  await page.getByLabel(/^ชื่อต้นแบบ/).fill("ใบงานใหม่")
  await page.getByLabel("คำชี้แจง", { exact: true }).fill("อ่านและวิเคราะห์")
  await page.getByRole("button", { name: "เพิ่มเกณฑ์", exact: true }).click()
  await page.getByLabel("ชื่อเกณฑ์ที่ 1", { exact: true }).fill("ความถูกต้อง")
  await page.getByLabel("คะแนนเต็ม", { exact: true }).fill("10")
  await page.getByRole("button", { name: "บันทึกต้นแบบ", exact: true }).click()
  await expect(page.getByText("ใบงานใหม่", { exact: true })).toBeVisible()
  expect(state.templates.at(-1).payload.worksheet.criteria[0].max).toBe(10)
})

test("lesson can select independent pre/post and worksheet copies", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL)
  await page.goto("/i/lesson/material-lesson")
  await page.getByRole("tab", { name: "ข้อสอบ Pre/Post", exact: true }).click()
  const visiblePicker = () => page.getByRole("button", { name: "เลือกจากคลัง", exact: true }).filter({ visible: true })
  await visiblePicker().click()
  await page.getByRole("button", { name: "เลือก", exact: true }).click()
  await page.getByRole("button", { name: "คัดลอกมาใช้ในบทเรียน", exact: true }).click()
  await expect(page.getByText("โจทย์จาก Master", { exact: true })).toBeVisible()
  await expect(visiblePicker()).toBeDisabled()
  await page.getByRole("tab", { name: "Post-test", exact: true }).click()
  await expect(visiblePicker()).toBeEnabled()
  await visiblePicker().click()
  await page.getByRole("button", { name: "เลือก", exact: true }).click()
  await page.getByRole("button", { name: "คัดลอกมาใช้ในบทเรียน", exact: true }).click()
  await expect(visiblePicker()).toBeDisabled()
  await page.getByRole("tab", { name: "ใบงาน + Rubric", exact: true }).click()
  await visiblePicker().click()
  await page.getByRole("button", { name: "เลือก", exact: true }).click()
  await page.getByLabel(/^กำหนดส่งใบงาน/).fill("2026-12-15")
  await page.getByRole("button", { name: "คัดลอกมาใช้ในบทเรียน", exact: true }).click()
  await expect(page.getByText("ต้นแบบ assignment", { exact: true })).toBeVisible()
  expect(state.copies).toHaveLength(3)
  expect(state.copies[2].p_due).toBe("2026-12-15")
  state.templates[0].payload.questions[0].text = "แก้ Master ภายหลัง"
  expect(state.questions[0].text).toBe("โจทย์จาก Master")
})

test("master and editor fit desktop and phone widths", async ({ page, baseURL }) => {
  await setup(page, baseURL)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/i/master/pretests")
    await expect(page.getByText("ต้นแบบ pre", { exact: true })).toBeVisible()
    if (width < 768) await page.getByRole("button", { name: "เปิด/ปิดเมนู", exact: true }).click()
    await expect(page.getByRole("button", { name: "คลังการสอน", exact: true })).toBeVisible()
    await page.screenshot({ path: path.join(os.tmpdir(), `lesson-material-nav-${width}.png`), animations: "disabled" })
    if (width < 768) {
      await page.getByRole("link", { name: "แบบทดสอบก่อนเรียน", exact: true }).click()
      await expect(page.getByRole("dialog", { name: "Sidebar", exact: true })).toBeHidden()
    }
    await page.getByRole("button", { name: "สร้างต้นแบบ", exact: true }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    const box = await page.getByRole("dialog").boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: path.join(os.tmpdir(), `lesson-material-editor-${width}.png`), animations: "disabled" })
    await page.getByRole("button", { name: "ยกเลิก", exact: true }).click()
  }
})
