import type { AnalysisStatus, AnalysisSummary } from "@/lib/tutor-analysis"
import type { StatusTone } from "@/components/common/status-badge"

export interface TutorSummary {
  overview: string
  topic_notes: Array<{ topic: string; comment: string }>
  next_steps: string[]
}

export interface TutorRound {
  id: string
  number: number
  score: number | null
  total: number | null
  status: string
  startedAt: string
  submittedAt: string | null
}

export interface ReviewChoice {
  id: string
  text: string
}

export interface TutorReviewEntry {
  n: number
  questionId: string
  deleted: boolean
  type: string | null
  text: string | null
  choices: ReviewChoice[]
  chosen: string | null
  answer: string | null
  correct: boolean
  unanswered: boolean
  topic: string | null
  explanation: string | null
}

export interface TutorResultResponse {
  attempt: {
    id: string
    number: number | null
    status: string
    score: number | null
    total: number | null
    startedAt: string
    submittedAt: string | null
  }
  bestId: string | null
  rounds: TutorRound[]
  summary: TutorSummary | null
  analysis: AnalysisSummary
  review: TutorReviewEntry[]
}

export type ResultViewState = "loading" | "ok" | "none" | "running" | "missing"

/** Badge tone and progress-bar classes of a topic status (weak / fair / strong). */
export const STATUS_TONE: Record<AnalysisStatus, StatusTone> = { weak: "danger", fair: "warning", strong: "success" }
export const STATUS_BAR: Record<AnalysisStatus, string> = {
  weak: "bg-destructive/15 [&>[data-slot=progress-indicator]]:bg-destructive",
  fair: "bg-warning/15 [&>[data-slot=progress-indicator]]:bg-warning",
  strong: "bg-success/15 [&>[data-slot=progress-indicator]]:bg-success",
}
