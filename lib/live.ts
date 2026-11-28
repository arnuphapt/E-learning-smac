// Pure functions only, no I/O, no imports: safe for server, client, and node --test.

export const TIME_LIMITS: readonly number[] = [5, 10, 20, 30, 60, 90, 120];

export interface ChoiceStyle {
  key: string;
  shape: string;
  label: string;
  name: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  badge: string;
}

export const CHOICE_STYLES: readonly ChoiceStyle[] = [
  {
    key: 'a',
    shape: 'triangle',
    label: 'ก',
    name: 'สามเหลี่ยม',
    color: '#ef4444',
    bg: 'bg-red-500',
    border: 'border-red-500',
    text: 'text-red-500',
    badge: 'bg-red-500 text-white',
  },
  {
    key: 'b',
    shape: 'diamond',
    label: 'ข',
    name: 'ข้าวหลามตัด',
    color: '#3b82f6',
    bg: 'bg-blue-600',
    border: 'border-blue-600',
    text: 'text-blue-600',
    badge: 'bg-blue-600 text-white',
  },
  {
    key: 'c',
    shape: 'circle',
    label: 'ค',
    name: 'วงกลม',
    color: '#eab308',
    bg: 'bg-amber-500',
    border: 'border-amber-500',
    text: 'text-amber-500',
    badge: 'bg-amber-500 text-white',
  },
  {
    key: 'd',
    shape: 'square',
    label: 'ง',
    name: 'สี่เหลี่ยม',
    color: '#10b981',
    bg: 'bg-emerald-600',
    border: 'border-emerald-600',
    text: 'text-emerald-600',
    badge: 'bg-emerald-600 text-white',
  },
];

export const PHASES: readonly string[] = ['lobby', 'question', 'reveal', 'leaderboard', 'ended'];

export interface PhaseTransition {
  from: string;
  action: string;
  to: string;
}

export const TRANSITIONS: readonly PhaseTransition[] = [
  { from: 'lobby', action: 'start', to: 'question' },
  { from: 'question', action: 'reveal', to: 'reveal' },
  { from: 'reveal', action: 'leaderboard', to: 'leaderboard' },
  { from: 'leaderboard', action: 'next', to: 'question' },
  { from: 'leaderboard', action: 'finish', to: 'ended' },
  { from: '*', action: 'end', to: 'ended' },
];

export const GRACE_MS = 500;

/**
 * Milliseconds until the host should fire the reveal: deadline + grace, in server time (never negative).
 */
export function revealDelayMs(deadlineMs: number, serverNowMs: number): number {
  return Math.max(0, Number(deadlineMs) + GRACE_MS - Number(serverNowMs));
}

export const POINTS_MIN = 1;
export const POINTS_MAX = 50;
export const POINTS_STEP = 1;
export const POINTS_DEFAULT = 10;

export function isValidPoints(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= POINTS_MIN && n <= POINTS_MAX && n % POINTS_STEP === 0;
}

export const TEAM_NAMES: readonly string[] = ['แดง', 'ฟ้า', 'เหลือง', 'เขียว', 'ม่วง', 'ส้ม', 'ชมพู', 'เทา'];

export interface QuizChoiceInput {
  id?: unknown;
  text?: unknown;
}

export interface QuizQuestionInput {
  text?: unknown;
  choices?: unknown;
  answer?: unknown;
  time_limit_sec?: unknown;
  points?: unknown;
}

export interface QuizProblem {
  index: number;
  reason: string;
}

export interface QuizValidationResult {
  ok: boolean;
  problems: QuizProblem[];
}

/**
 * Validate quiz structure and questions.
 */
export function validateQuiz(questions: unknown): QuizValidationResult {
  const problems: QuizProblem[] = [];

  if (!Array.isArray(questions) || questions.length === 0) {
    return {
      ok: false,
      problems: [{ index: -1, reason: 'ไม่มีคำถามในชุดควิซ' }],
    };
  }

  questions.forEach((rawQ: unknown, index: number) => {
    const q = rawQ && typeof rawQ === 'object' ? (rawQ as QuizQuestionInput) : null;
    if (!q || typeof q.text !== 'string' || !q.text.trim()) {
      problems.push({ index, reason: 'คำถามต้องมีข้อความ' });
    }

    if (!q || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) {
      problems.push({ index, reason: 'ตัวเลือกต้องมี 2-4 ข้อ' });
    } else {
      const hasEmptyChoice = q.choices.some((rawC: unknown) => {
        const c = rawC && typeof rawC === 'object' ? (rawC as QuizChoiceInput) : null;
        return !c || typeof c.text !== 'string' || !c.text.trim();
      });
      if (hasEmptyChoice) {
        problems.push({ index, reason: 'ข้อความตัวเลือกต้องไม่ว่าง' });
      }

      const choiceIds = q.choices.map((rawC: unknown) =>
        rawC && typeof rawC === 'object' ? (rawC as QuizChoiceInput).id : undefined
      );
      if (!q.answer || !choiceIds.includes(q.answer)) {
        problems.push({ index, reason: 'ต้องระบุคำตอบที่ถูกต้องและต้องตรงกับตัวเลือก' });
      }
    }

    if (!q || !TIME_LIMITS.includes(Number(q.time_limit_sec))) {
      problems.push({ index, reason: 'เวลาต่อข้อต้องอยู่ในค่าที่กำหนด' });
    }

    // points is optional here so legacy callers/rows without it still validate (DB default is 10).
    if (q && q.points !== undefined && !isValidPoints(q.points)) {
      problems.push({ index, reason: 'คะแนนต่อข้อต้องเป็นจำนวนเต็ม 1-50' });
    }
  });

  return {
    ok: problems.length === 0,
    problems,
  };
}

export interface NextPhaseContext {
  index?: number;
  total?: number;
}

export interface NextPhaseResult {
  phase: string;
  index: number;
}

/**
 * Transition state machine for live quiz session.
 */
export function nextPhase(
  phase: string,
  action: string,
  { index = 0, total = 0 }: NextPhaseContext = {}
): NextPhaseResult | null {
  const currIndex = typeof index === 'number' ? index : 0;
  const currTotal = typeof total === 'number' ? total : 0;

  if (action === 'end') {
    if (phase === 'ended') return null;
    return { phase: 'ended', index: currIndex };
  }

  if (action === 'start') {
    if (phase === 'lobby') {
      return { phase: 'question', index: 0 };
    }
    return null;
  }

  if (action === 'reveal') {
    if (phase === 'question') {
      return { phase: 'reveal', index: currIndex };
    }
    return null;
  }

  if (action === 'leaderboard') {
    if (phase === 'reveal') {
      return { phase: 'leaderboard', index: currIndex };
    }
    return null;
  }

  if (action === 'next') {
    if (phase === 'leaderboard' && currIndex + 1 < currTotal) {
      return { phase: 'question', index: currIndex + 1 };
    }
    return null;
  }

  if (action === 'finish') {
    if (phase === 'leaderboard' && currIndex + 1 >= currTotal) {
      return { phase: 'ended', index: currIndex };
    }
    return null;
  }

  return null;
}

/**
 * Calculate score for an answer based on elapsed time and limit.
 * Keep this formula in sync with the SQL live_answer_submit function.
 */
export function scorePoints({
  elapsedMs,
  limitSec,
  correct,
  maxPoints = POINTS_DEFAULT,
}: {
  elapsedMs: number;
  limitSec: number;
  correct: boolean;
  maxPoints?: number;
}): number {
  if (!correct) return 0;

  const limitMs = (Number(limitSec) || 0) * 1000;
  if (limitMs <= 0) return Math.round(maxPoints / 2);

  const clampedElapsed = Math.max(0, Math.min(Number(elapsedMs) || 0, limitMs));
  const ratio = clampedElapsed / limitMs;
  return Math.round(maxPoints * (1 - ratio / 2));
}

/**
 * Check if the answer arrived past the deadline plus grace window.
 */
export function isLate(nowMs: number, deadlineMs: number): boolean {
  return Number(nowMs) > Number(deadlineMs) + GRACE_MS;
}

/**
 * Calculate team score as the rounded average of member scores.
 */
export function teamScore(memberTotals: readonly number[]): number {
  if (!Array.isArray(memberTotals) || memberTotals.length === 0) return 0;
  const sum = memberTotals.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  return Math.round(sum / memberTotals.length);
}

// Sort by score descending, preserving input order for ties, then assign competition ranks.
export function rankRows<T extends object, K extends keyof T>(
  rows: readonly T[],
  scoreKey: K
): Array<T & { rank: number }> {
  const sorted = [...rows].sort((a, b) => Number(b[scoreKey]) - Number(a[scoreKey]));
  let rank = 0;
  return sorted.map((row, index) => {
    if (index === 0 || Number(row[scoreKey]) !== Number(sorted[index - 1][scoreKey])) {
      rank = index + 1;
    }
    return { ...row, rank };
  });
}

export interface PickTeamInput {
  id: string;
  colorNo?: number | null;
  color_no?: number | null;
  count?: number | null;
  members?: number | null;
}

/**
 * Assign new player to the team with fewest members; ties broken by lowest colorNo.
 */
export function pickTeam(teams: readonly PickTeamInput[]): string | null {
  if (!Array.isArray(teams) || teams.length === 0) return null;
  let best: PickTeamInput | null = null;

  for (const team of teams) {
    if (!best) {
      best = team;
      continue;
    }

    const count = Number(team.count ?? team.members ?? 0);
    const bestCount = Number(best.count ?? best.members ?? 0);
    const colorNo = Number(team.colorNo ?? team.color_no ?? 0);
    const bestColorNo = Number(best.colorNo ?? best.color_no ?? 0);

    if (count < bestCount) {
      best = team;
    } else if (count === bestCount && colorNo < bestColorNo) {
      best = team;
    }
  }

  return best ? best.id : null;
}

/**
 * Generate a 6-digit PIN where the first digit is not 0.
 * Uses globalThis.crypto.getRandomValues.
 */
export function genPin(): string {
  const buf = new Uint32Array(1);
  const max = 0xffffffff - (0xffffffff % 900000);
  let val: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= max);

  return String(100000 + (val % 900000));
}
