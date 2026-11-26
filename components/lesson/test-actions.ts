import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { Json } from "@/lib/database.types"
import { getTodayStr, parseTestConfig, type LessonRow, type OnSaveLesson, type QuestionEditorItem, type QuestionRow, type TestConfig } from "./types"

export type TestKind = "pre" | "post"

export interface TestForm {
  passing: number | string
  time: number | string
  attempts: string
  shuffle: boolean
  showAnswers: boolean
  due: string
  dueTime: string
  required: boolean
}

export const formFrom = (cfg: TestConfig): TestForm => ({
  passing: cfg.passing_score ?? 50,
  time: cfg.time_limit ?? 30,
  attempts: cfg.attempts ?? "1",
  shuffle: cfg.shuffle ?? true,
  showAnswers: cfg.show_answers ?? true,
  due: cfg.due || getTodayStr(),
  dueTime: cfg.due_time ?? "23:59",
  required: cfg.required ?? true,
})

export const emptyQuestion = (no: number): QuestionEditorItem => ({
  no,
  type: "single",
  text: "",
  choices: [
    { id: "a", text: "" },
    { id: "b", text: "" },
  ],
  answer: "a",
  id: "temp_" + Date.now(),
})

export async function saveTestSettings({
  lesson,
  kind,
  form,
  onSaveSettings,
}: {
  lesson: LessonRow
  kind: TestKind
  form: TestForm
  onSaveSettings: OnSaveLesson
}) {
  const config = {
    ...parseTestConfig(kind === "pre" ? lesson.pretest : lesson.posttest),
    required: form.required,
    passing_score: form.passing === "" || form.passing === "—" ? null : parseInt(String(form.passing)) || 0,
    time_limit: parseInt(String(form.time)) || 0,
    attempts: form.attempts,
    shuffle: form.shuffle,
    show_answers: form.showAnswers,
    due: form.due || null,
    due_time: form.dueTime || null,
  } as Json
  await onSaveSettings(kind === "pre" ? { pretest: config } : { posttest: config })
}

export async function saveTestQuestion({
  lessonId,
  kind,
  nq,
  nextNo,
  onLoad,
}: {
  lessonId: string
  kind: TestKind
  nq: QuestionEditorItem
  nextNo: number
  onLoad: () => void
}) {
  const fields = { type: nq.type || "single", text: nq.text, choices: nq.choices as unknown as Json, answer: nq.answer, lesson_id: lessonId, kind }
  if (nq.id && !String(nq.id).startsWith("temp_")) {
    const { error } = await supabase.from("questions").update({ no: nq.no, ...fields }).eq("id", nq.id)
    if (error) toast.error("เกิดข้อผิดพลาด: " + error.message)
    else {
      toast.success("บันทึกข้อสอบแล้ว")
      onLoad()
    }
  } else {
    const { error } = await supabase.from("questions").insert([{ id: "q_" + Date.now(), no: nextNo, ...fields }])
    if (error) toast.error("เกิดข้อผิดพลาด: " + error.message)
    else {
      toast.success("เพิ่มข้อสอบใหม่เรียบร้อยแล้ว")
      onLoad()
    }
  }
}

export async function deleteTestQuestion({
  lesson,
  questions,
  q,
  onLoad,
}: {
  lesson: LessonRow
  questions: QuestionRow[]
  q: QuestionRow
  onLoad: () => void
}) {
  const remainingCount = questions.filter((x) => x.kind === q.kind && x.id !== q.id).length
  const isReq = q.kind === "pre" ? parseTestConfig(lesson.pretest).required : parseTestConfig(lesson.posttest).required
  if (isReq && remainingCount === 0) {
    toast.warning(`ไม่สามารถลบได้ เนื่องจากบทเรียนนี้กำหนดให้ต้องทำ ${q.kind === "pre" ? "Pre-test" : "Post-test"} แต่ระบบต้องการข้อสอบอย่างน้อย 1 ข้อ (กรุณาปิดการตั้งค่าความจำเป็นก่อนลบข้อสอบสุดท้าย)`)
    return
  }
  const { error } = await supabase.from("questions").delete().eq("id", q.id)
  if (error) toast.error("เกิดข้อผิดพลาด: " + error.message)
  else {
    toast.success("ลบข้อสอบเรียบร้อยแล้ว")
    onLoad()
  }
}
