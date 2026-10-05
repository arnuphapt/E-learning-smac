// Pure timing rules for a tutor attempt. No imports: safe for server, client and node --test.
// One clock for the whole round: deadline_at is fixed by the SERVER at start, 1 minute per question.
export const SECONDS_PER_QUESTION = 60;

export const minutesFor = (count) => (count * SECONDS_PER_QUESTION) / 60;

// nowMs: server time in ms. Returns an ISO string for tutor_attempts.deadline_at.
export const deadlineFor = (nowMs, count) => new Date(nowMs + count * SECONDS_PER_QUESTION * 1000).toISOString();

// An attempt past its deadline is not extended: any access at or after deadline_at counts as ended.
export const isPastDeadline = (deadlineAt, nowMs) => nowMs >= Date.parse(deadlineAt);

// First question the student has not answered (resume lands there); 0 when everything is answered or nothing is.
export function firstUnansweredIndex(questionIds, answers) {
  const i = questionIds.findIndex((id) => answers[id] == null);
  return i === -1 ? 0 : i;
}
