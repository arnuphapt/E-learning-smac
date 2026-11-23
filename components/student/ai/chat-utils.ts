import type { ChatMessage, ChatSession, LessonDoc, StudentLessonRow } from "./types"

const EMOTION_RE = /\[emotion:\s*(impressive|mad|smile|idle|sad)\]/i

/** The model tags its reply with `[emotion: x]`: split it into the avatar emotion and the text to show. */
export function parseEmotionAndReply(text: string | null | undefined): { emotion: string; cleanText: string } {
  if (!text) return { emotion: "smile", cleanText: "" }
  const match = text.match(EMOTION_RE)
  if (!match) return { emotion: "smile", cleanText: text }
  return { emotion: match[1].toLowerCase(), cleanText: text.replace(new RegExp(EMOTION_RE, "gi"), "").trim() }
}

export function defaultGreeting(lessonTitle?: string | null) {
  return `สวัสดีค่ะ! ยูริยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"${lessonTitle || "บทเรียนนี้"}"**\n\nยูริพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนแล้ว ถามคำถามมาด้านล่างได้เลยค่ะ!`
}

export function newSessionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
}

/** Greeting followed by every logged question/answer pair of a session. */
export function sessionToMessages(greeting: string, session: ChatSession): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: "assistant", content: greeting }]
  for (const log of session.logs) {
    msgs.push({ role: "user", content: parseEmotionAndReply(log.message).cleanText })
    msgs.push({ role: "assistant", content: parseEmotionAndReply(log.reply).cleanText })
  }
  return msgs
}

export function lessonDocsOf(lesson?: StudentLessonRow): LessonDoc[] {
  const docs: readonly unknown[] = Array.isArray(lesson?.documents) ? (lesson.documents as readonly unknown[]) : []
  return docs.filter(
    (d): d is LessonDoc =>
      Boolean(d) &&
      typeof d === "object" &&
      !Array.isArray(d) &&
      typeof (d as { url?: unknown }).url === "string" &&
      typeof (d as { name?: unknown }).name === "string",
  )
}

export const PROMPT_CARDS = [
  {
    title: "สรุปเนื้อหาสำคัญ",
    desc: "ประเด็นหลักและจุดสำคัญที่ต้องจำในบทเรียนนี้",
    prompt: "ช่วยสรุปเนื้อหาสำคัญและประเด็นหลักของบทเรียนนี้แบบกระชับ เข้าใจง่ายให้หน่อยค่ะ/ครับ",
  },
  {
    title: "อธิบายจุดที่มักเข้าใจผิด",
    desc: "ชี้เป้าจุดยากหรือหัวข้อที่มักสับสนในบทเรียนนี้",
    prompt: "ในบทเรียนนี้ มีจุดไหนที่นักศึกษามักเข้าใจผิด หรือเป็นจุดยากที่ควรทำความเข้าใจเป็นพิเศษบ้างคะ/ครับ?",
  },
  {
    title: "ยกตัวอย่างการนำไปใช้จริง",
    desc: "เชื่อมโยงทฤษฎีกับการปฏิบัติและการดูแลผู้ป่วยจริง",
    prompt: "ช่วยยกตัวอย่างสถานการณ์การนำความรู้ในบทเรียนนี้ไปประยุกต์ใช้ในการปฏิบัติการพยาบาลจริงให้เห็นภาพหน่อยค่ะ/ครับ",
  },
  {
    title: "ท้าทายด้วยคำถามทดสอบ",
    desc: "สุ่มคำถาม 3 ข้อเพื่อทดสอบความเข้าใจพร้อมเฉลย",
    prompt: "ช่วยตั้งคำถามทดสอบความเข้าใจเกี่ยวกับบทเรียนนี้ 3 ข้อพร้อมเฉลยและคำอธิบายละเอียดให้หน่อยค่ะ/ครับ",
  },
]
