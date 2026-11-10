// Pure functions only, no I/O, no imports: safe for server, client, and node --test.

export const TIME_LIMITS = [5, 10, 20, 30, 60, 90, 120];

export const CHOICE_STYLES = [
  {
    key: 'a',
    shape: 'triangle',
    label: 'A',
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
    label: 'B',
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
    label: 'C',
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
    label: 'D',
    name: 'สี่เหลี่ยม',
    color: '#10b981',
    bg: 'bg-emerald-600',
    border: 'border-emerald-600',
    text: 'text-emerald-600',
    badge: 'bg-emerald-600 text-white',
  },
];

export const PHASES = ['lobby', 'question', 'reveal', 'leaderboard', 'ended'];

export const TRANSITIONS = [
  { from: 'lobby', action: 'start', to: 'question' },
  { from: 'question', action: 'reveal', to: 'reveal' },
  { from: 'reveal', action: 'leaderboard', to: 'leaderboard' },
  { from: 'leaderboard', action: 'next', to: 'question' },
  { from: 'leaderboard', action: 'finish', to: 'ended' },
  { from: '*', action: 'end', to: 'ended' },
];

export const GRACE_MS = 500;

export const TEAM_NAMES = ['แดง', 'ฟ้า', 'เหลือง', 'เขียว', 'ม่วง', 'ส้ม', 'ชมพู', 'เทา'];

/**
 * Validate quiz structure and questions.
 * @param {Array<{ text: string, choices: Array<{ id: string, text: string }>, answer: string, time_limit_sec: number }>} questions
 * @returns {{ ok: boolean, problems: Array<{ index: number, reason: string }> }}
 */
export function validateQuiz(questions) {
  const problems = [];

  if (!Array.isArray(questions) || questions.length === 0) {
    return {
      ok: false,
      problems: [{ index: -1, reason: 'ไม่มีคำถามในชุดควิซ' }],
    };
  }

  questions.forEach((q, index) => {
    if (!q || typeof q.text !== 'string' || !q.text.trim()) {
      problems.push({ index, reason: 'คำถามต้องมีข้อความ' });
    }

    if (!q || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) {
      problems.push({ index, reason: 'ตัวเลือกต้องมี 2-4 ข้อ' });
    } else {
      const hasEmptyChoice = q.choices.some(
        (c) => !c || typeof c.text !== 'string' || !c.text.trim()
      );
      if (hasEmptyChoice) {
        problems.push({ index, reason: 'ข้อความตัวเลือกต้องไม่ว่าง' });
      }

      const choiceIds = q.choices.map((c) => (c ? c.id : undefined));
      if (!q.answer || !choiceIds.includes(q.answer)) {
        problems.push({ index, reason: 'ต้องระบุคำตอบที่ถูกต้องและต้องตรงกับตัวเลือก' });
      }
    }

    if (!q || !TIME_LIMITS.includes(Number(q.time_limit_sec))) {
      problems.push({ index, reason: 'เวลาต่อข้อต้องอยู่ในค่าที่กำหนด' });
    }
  });

  return {
    ok: problems.length === 0,
    problems,
  };
}

/**
 * Transition state machine for live quiz session.
 * @param {string} phase Current phase
 * @param {string} action Action to execute ('start' | 'reveal' | 'leaderboard' | 'next' | 'finish' | 'end')
 * @param {{ index?: number, total?: number }} [context]
 * @returns {{ phase: string, index: number } | null}
 */
export function nextPhase(phase, action, { index = 0, total = 0 } = {}) {
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
export function scorePoints({ elapsedMs, limitSec, correct }) {
  if (!correct) return 0;

  const limitMs = (Number(limitSec) || 0) * 1000;
  if (limitMs <= 0) return 500;

  const clampedElapsed = Math.max(0, Math.min(Number(elapsedMs) || 0, limitMs));
  const ratio = clampedElapsed / limitMs;
  return Math.round(1000 * (1 - ratio / 2));
}

/**
 * Check if the answer arrived past the deadline plus grace window.
 * @param {number} nowMs
 * @param {number} deadlineMs
 * @returns {boolean}
 */
export function isLate(nowMs, deadlineMs) {
  return Number(nowMs) > Number(deadlineMs) + GRACE_MS;
}

/**
 * Calculate team score as the rounded average of member scores.
 * @param {number[]} memberTotals
 * @returns {number}
 */
export function teamScore(memberTotals) {
  if (!Array.isArray(memberTotals) || memberTotals.length === 0) return 0;
  const sum = memberTotals.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  return Math.round(sum / memberTotals.length);
}

// Sort by score descending, preserving input order for ties, then assign competition ranks.
export function rankRows(rows, scoreKey) {
  const sorted = [...rows].sort((a, b) => Number(b[scoreKey]) - Number(a[scoreKey]));
  let rank = 0;
  return sorted.map((row, index) => {
    if (index === 0 || Number(row[scoreKey]) !== Number(sorted[index - 1][scoreKey])) {
      rank = index + 1;
    }
    return { ...row, rank };
  });
}

/**
 * Assign new player to the team with fewest members; ties broken by lowest colorNo.
 * @param {Array<{ id: string, colorNo?: number, color_no?: number, count?: number, members?: number }>} teams
 * @returns {string | null}
 */
export function pickTeam(teams) {
  if (!Array.isArray(teams) || teams.length === 0) return null;
  let best = null;

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
 * @returns {string}
 */
export function genPin() {
  const buf = new Uint32Array(1);
  const max = 0xffffffff - (0xffffffff % 900000);
  let val;
  do {
    globalThis.crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= max);

  return String(100000 + (val % 900000));
}
