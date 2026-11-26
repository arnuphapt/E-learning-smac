import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyMaterial, materialSnapshot, validateMaterial } from "../lib/lesson-materials.ts"

function testMaterial() {
  const p = emptyMaterial()
  p.questions.push({ text: "Question", type: "single", choices: [{ id: "a", text: "Yes" }, { id: "b", text: "No" }], answer: "a" })
  return p
}

test("masters exclude lesson IDs, deadlines and results, with independent nested content", () => {
  const source = testMaterial()
  Object.assign(source.config, { due: "2026-12-01", due_time: "12:30", taken: true, score: 10 })
  Object.assign(source.questions[0], { id: "old-question", lesson_id: "old-lesson", no: 7 })
  source.worksheet.criteria.push({ id: "criterion", name: "Reasoning", max: 10 })
  const a = materialSnapshot(source)
  const b = materialSnapshot(source)
  assert.equal(a.config.due, undefined)
  assert.equal(a.config.due_time, undefined)
  assert.equal(a.config.taken, undefined)
  assert.equal(a.config.score, undefined)
  assert.equal(a.questions[0].id, undefined)
  assert.equal(a.questions[0].lesson_id, undefined)
  a.questions[0].choices[0].text = "Edited in one copy"
  a.worksheet.criteria[0].max = 99
  assert.equal(b.questions[0].choices[0].text, "Yes")
  assert.equal(source.questions[0].choices[0].text, "Yes")
  assert.equal(b.worksheet.criteria[0].max, 10)
})

test("pre/post masters need a nonempty valid question bank", () => {
  for (const kind of ["pre", "post"]) {
    assert.match(validateMaterial(kind, "Title", emptyMaterial()), /คำถาม/)
    const p = testMaterial()
    assert.equal(validateMaterial(kind, "Title", p), null)
    p.questions[0].answer = "deleted-choice"
    assert.match(validateMaterial(kind, "Title", p), /เฉลย/)
    p.questions[0].answer = "a"
    p.questions[0].choices[1].id = "a"
    assert.match(validateMaterial(kind, "Title", p), /ตัวเลือก/)
  }
})

test("invalid settings and blank content cannot become reusable tests", () => {
  const p = testMaterial()
  assert.match(validateMaterial("pre", "  ", p), /ชื่อ/)
  p.config.passing_score = 101
  assert.match(validateMaterial("pre", "Title", p), /คะแนนผ่าน/)
  p.config.passing_score = 50
  p.config.time_limit = 0.5
  assert.match(validateMaterial("pre", "Title", p), /เวลา/)
  p.config.time_limit = 0
  assert.match(validateMaterial("pre", "Title", p), /เวลา/)
  p.config.time_limit = 30
  assert.equal(validateMaterial("pre", "Title", p), null)
  p.questions[0].choices[0].text = " "
  assert.match(validateMaterial("pre", "Title", p), /ตัวเลือก/)
})

test("worksheet masters require submission method and usable rubric, without lesson due dates", () => {
  const p = emptyMaterial()
  assert.match(validateMaterial("assignment", "Title", p), /เกณฑ์/)
  p.worksheet.criteria = [{ id: "c1", name: "Reasoning", max: 10 }]
  assert.equal(validateMaterial("assignment", "Title", p), null)
  p.worksheet.allow_file = p.worksheet.allow_text = false
  assert.match(validateMaterial("assignment", "Title", p), /รูปแบบ/)
  p.worksheet.allow_text = true
  p.worksheet.criteria[0].max = -1
  assert.match(validateMaterial("assignment", "Title", p), /คะแนน/)
  p.worksheet.criteria[0].max = 10
  p.worksheet.criteria[0].max = 1.5
  assert.match(validateMaterial("assignment", "Title", p), /จำนวนเต็ม/)
  p.worksheet.criteria[0].max = 10
  p.worksheet.criteria.push({ id: "c1", name: "Duplicate", max: 5 })
  assert.match(validateMaterial("assignment", "Title", p), /ซ้ำ/)
})
