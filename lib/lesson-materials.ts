export type MaterialKind = "pre" | "post" | "assignment"

export const MATERIAL_LABELS: Record<MaterialKind, string> = {
  pre: "แบบทดสอบก่อนเรียน", post: "แบบทดสอบหลังเรียน", assignment: "ใบงาน",
}

export interface MaterialQuestion {
  text: string
  type: string
  choices: { id: string; text: string }[]
  answer: string
}

export interface MaterialConfig {
  required: boolean
  passing_score: number
  time_limit: number
  attempts: string
  shuffle: boolean
  show_answers: boolean
}

export interface MaterialWorksheet {
  instructions: string
  allow_file: boolean
  allow_text: boolean
  allow_late: boolean
  criteria: { id: string; name: string; desc?: string; max: number }[]
}

export interface MaterialPayload {
  config: MaterialConfig
  questions: MaterialQuestion[]
  worksheet: MaterialWorksheet
}

export function emptyMaterial(): MaterialPayload {
  return {
    config: { required: false, passing_score: 50, time_limit: 30, attempts: "1", shuffle: true, show_answers: true },
    questions: [],
    worksheet: { instructions: "", allow_file: true, allow_text: true, allow_late: false, criteria: [] },
  }
}

/** Whitelist reusable content: no lesson IDs, result state, or due dates enter the master. */
export function materialSnapshot(payload: MaterialPayload): MaterialPayload {
  const { required, passing_score, time_limit, attempts, shuffle, show_answers } = payload.config
  const { instructions, allow_file, allow_text, allow_late, criteria } = payload.worksheet
  return {
    config: { required, passing_score, time_limit, attempts, shuffle, show_answers },
    questions: payload.questions.map(({ text, type, choices, answer }) => ({
      text, type, answer, choices: choices.map(({ id, text }) => ({ id, text })),
    })),
    worksheet: { instructions, allow_file, allow_text, allow_late,
      criteria: criteria.map(({ id, name, desc, max }) => ({ id, name, desc: desc ?? "", max })),
    },
  }
}

export function validateMaterial(kind: MaterialKind, title: string, payload: MaterialPayload): string | null {
  if (!title.trim()) return "กรุณากรอกชื่อต้นแบบ"
  if (kind === "assignment") {
    const w = payload.worksheet
    if (!w.allow_file && !w.allow_text) return "กรุณาเลือกรูปแบบการส่งงานอย่างน้อย 1 แบบ"
    if (!w.criteria.length) return "กรุณาเพิ่มเกณฑ์การให้คะแนนอย่างน้อย 1 เกณฑ์"
    if (w.criteria.some((c) => !c.id || !c.name.trim() || !Number.isInteger(c.max) || c.max <= 0)) return "กรุณากรอกชื่อเกณฑ์และคะแนนเต็มเป็นจำนวนเต็มที่มากกว่า 0 ให้ครบ"
    if (new Set(w.criteria.map((c) => c.id)).size !== w.criteria.length) return "รหัสเกณฑ์การให้คะแนนซ้ำกัน"
    return null
  }
  if (!payload.questions.length) return "กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ"
  for (const [i, q] of payload.questions.entries()) {
    if (!q.text.trim() || q.type !== "single" || q.choices.length < 2 || q.choices.some((c) => !c.id || !c.text.trim()) ||
        new Set(q.choices.map((c) => c.id)).size !== q.choices.length || !q.choices.some((c) => c.id === q.answer)) {
      return `กรุณาตรวจโจทย์ ตัวเลือก และเฉลยของข้อที่ ${i + 1}`
    }
  }
  const c = payload.config
  if (!Number.isFinite(c.passing_score) || c.passing_score < 0 || c.passing_score > 100) return "คะแนนผ่านต้องอยู่ระหว่าง 0–100"
  if (!Number.isInteger(c.time_limit) || c.time_limit <= 0) return "เวลาทำต้องเป็นจำนวนนาทีที่มากกว่า 0"
  if (!["1", "2", "unlimited"].includes(c.attempts)) return "กรุณาเลือกจำนวนครั้งที่ทำได้"
  return null
}
