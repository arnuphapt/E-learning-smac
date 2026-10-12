// Pure timing rules for a tutor attempt. No imports: safe for server, client and node --test.
// One clock for the whole round: deadline_at is fixed by the SERVER at start, 1 minute per question.
export const SECONDS_PER_QUESTION = 60;

export const minutesFor = (count) => (count * SECONDS_PER_QUESTION) / 60;

// Per-lesson round time (lessons.tutor_time_limit_minutes): NULL = the default rule above (1 minute per question), else
// that many minutes for the WHOLE round. Whole minutes, 1..TIME_LIMIT_MAX (the database CHECK says the same).
export const TIME_LIMIT_MAX = 180;
export const roundMinutes = (count, limitMinutes = null) => (limitMinutes == null ? minutesFor(count) : limitMinutes);

// Instructor input -> minutes | null (blank = default rule) | undefined (invalid).
export function parseTimeLimit(input) {
  const s = String(input ?? "").trim();
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n >= 1 && n <= TIME_LIMIT_MAX ? n : undefined;
}

// nowMs: server time in ms. Returns an ISO string for tutor_attempts.deadline_at.
export const deadlineFor = (nowMs, count, limitMinutes = null) => new Date(nowMs + roundMinutes(count, limitMinutes) * 60 * 1000).toISOString();

// An attempt past its deadline is not extended: any access at or after deadline_at counts as ended.
export const isPastDeadline = (deadlineAt, nowMs) => nowMs >= Date.parse(deadlineAt);

// First question the student has not answered (resume lands there); 0 when everything is answered or nothing is.
export function firstUnansweredIndex(questionIds, answers) {
  const i = questionIds.findIndex((id) => answers[id] == null);
  return i === -1 ? 0 : i;
}

// Attempt limit (lessons.tutor_max_attempts, NULL = unlimited). used = every round the student ever STARTED on the lesson
// (submitted, expired or abandoned). An open round can always be resumed; a new one needs used < limit.
// The database trigger tutor_attempt_limit_guard is the real enforcement (code TA001); this is what the screens show.
export const canStartAttempt = (limit, used, hasOpen) => hasOpen || limit == null || used < limit;
export const ATTEMPT_LIMIT_CODE = "TA001";
export const ATTEMPT_LIMIT_MESSAGE = "บทนี้ทำได้ครั้งเดียว และทำไปแล้ว";
