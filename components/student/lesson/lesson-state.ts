import { formatDueThai, isPastDue, parseTestConfig, type LessonRow, type TestScoreRow } from "./types"

export interface TestState {
  required: boolean
  taken: boolean
  score: number | null
  total: number | null
  pastDue: boolean
  dueText: string
}

/** What the student has done on a lesson: pre/post test state, whether the pre-test still gates the lesson, and whether the video exists. */
export function deriveLessonState(lesson: LessonRow, testScore: TestScoreRow | null, questionCounts: { pre: number; post: number }) {
  const build = (cfgRaw: LessonRow["pretest"], score: number | null | undefined, count: number): TestState => {
    const cfg = parseTestConfig(cfgRaw)
    const taken = testScore ? score !== null && score !== undefined : false
    const due = cfg?.due
    const dueTime = cfg?.due_time || "23:59"
    return {
      required: cfg?.required ?? true,
      taken,
      score: testScore ? (score ?? null) : 0,
      total: testScore ? testScore.total : count,
      pastDue: !taken && isPastDue(due, dueTime),
      dueText: formatDueThai(due, dueTime),
    }
  }
  const pre = build(lesson.pretest, testScore?.pre, questionCounts.pre)
  const post = build(lesson.posttest, testScore?.post, questionCounts.post)
  return {
    pre,
    post,
    gated: !!(lesson.has_pretest && pre.required && !pre.taken),
    hasNoVideo: !lesson.video || !lesson.video_url,
  }
}
