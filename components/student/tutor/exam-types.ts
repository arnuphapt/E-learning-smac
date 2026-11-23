import { firstUnansweredIndex } from "@/lib/tutor-attempt"

export interface TutorLessonInfo {
  set: { id: string; code: string | null }
  lesson: { id: string; index: number | null; title: string; timeLimit: number | null }
}

export interface AttemptPreview {
  serverNow: string
  count: number
  minutes: number
  limit: number | null
  canStart: boolean
  attempt: { id: string; count: number; deadlineAt: string; expired: boolean } | null
}

export type ExamQuestionChoice = { id: string; text: string }

export interface ExamQuestion {
  id: string
  type: string | null
  text: string | null
  choices: ExamQuestionChoice[]
}

export interface ExamAttempt {
  id: string
  startedAt: string
  deadlineAt: string
  count: number
  minutes: number
  resumed: boolean
}

export interface AttemptPayload {
  serverNow: string
  attempt: ExamAttempt
  questions: ExamQuestion[]
  answers: Record<string, string | null>
}

export interface ExamState {
  attempt: ExamAttempt
  questions: ExamQuestion[]
  deadlineMs: number
  offset: number
  answers: Record<string, string | null>
  cur: number
}

export interface SubmitResult {
  status: string
  score: number
  total: number
}

export const attemptUrl = (id: string) => "/api/tutor/lessons/" + encodeURIComponent(id) + "/attempt"
export const attemptActionUrl = (attemptId: string, action: string) => "/api/tutor/attempts/" + encodeURIComponent(attemptId) + "/" + action
export const post = (id: string, body: Record<string, unknown>) =>
  fetch(attemptUrl(id), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

// POST payload -> exam state. offset = server clock minus this device's clock, so the countdown follows the server.
// ponytail: offset ignores network latency (error = one request trip, typically well under a second).
export const toExam = (d: AttemptPayload): ExamState => ({
  attempt: d.attempt,
  questions: d.questions,
  deadlineMs: Date.parse(d.attempt.deadlineAt),
  offset: Date.parse(d.serverNow) - Date.now(),
  answers: d.answers,
  cur: firstUnansweredIndex(d.questions.map((q) => q.id), d.answers), // resume lands on the first unanswered question
})

// strictly increasing per page: the server clock in ms, or last + 1 when two clicks land in the same millisecond
export const nextSeq = (last: number, offset: number) => Math.max(Date.now() + offset, last + 1)

export const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
