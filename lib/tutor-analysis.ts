// Pure analysis of one scored tutor attempt. No imports: safe for server and node --test.
// The thresholds are system-wide constants: no per-set / per-lesson configuration exists on purpose.
//
//   percent < 60          -> "weak"   จุดอ่อน
//   60 <= percent < 70    -> "fair"   ผ่าน ยังไม่แน่น
//   percent >= 70         -> "strong" จุดแข็ง
//
// Rounding: the percent is FLOORED, so 59.5% is 59 (weak), never a "60%" that still carries the weak badge. Because both
// thresholds are whole numbers, floor(percent) >= T is exactly the same as correct / total >= T / 100.
// An unanswered question is wrong in the percent (scoreAttempt already marks it correct = false).

export type AnalysisStatus = "weak" | "fair" | "strong";

export const PASS_PERCENT = 60;
export const STRONG_PERCENT = 70;
export const STATUS_LABEL: Record<AnalysisStatus, string> = { weak: "จุดอ่อน", fair: "ผ่าน ยังไม่แน่น", strong: "จุดแข็ง" };
export const UNTAGGED_NAME = "ไม่ระบุหัวข้อ";

export const percentOf = (correct: number, total: number): number =>
  total > 0 ? Math.floor((correct * 100) / total) : 0;
export const statusOf = (percent: number): AnalysisStatus =>
  percent >= STRONG_PERCENT ? "strong" : percent >= PASS_PERCENT ? "fair" : "weak";

export interface AnalysisRowInput {
  topic_id?: string | null;
  topic?: string | null;
  correct: boolean;
  unanswered: boolean;
}

export interface AnalysisGroup {
  topic_id: string | null;
  name: string;
  correct: number;
  total: number;
  unanswered: number;
  percent: number;
  status: AnalysisStatus;
}

export interface AnalysisReviewItem {
  topic_id: string | null;
  name: string;
  status: AnalysisStatus;
  percent: number;
  reason: string;
}

export interface AnalysisSummary {
  overall: {
    correct: number;
    total: number;
    percent: number;
    pass: boolean;
  };
  groups: AnalysisGroup[];
  review: AnalysisReviewItem[];
}

function reasonOf(g: AnalysisGroup): string {
  const head = `ตอบถูก ${g.correct} จาก ${g.total} ข้อ (${g.percent}%) `;
  const tail = g.status === "weak" ? `ต่ำกว่าเกณฑ์ ${PASS_PERCENT}%` : `ผ่านแล้ว แต่ยังไม่ถึง ${STRONG_PERCENT}%`;
  return head + tail + (g.unanswered > 0 ? ` · ไม่ได้ตอบ ${g.unanswered} ข้อ` : "");
}

// rows: [{ topic_id: string | null, topic: string | null, correct: boolean, unanswered: boolean }]
// lessonName: name of the single group when no question carries a topic (the result is then split by lesson).
// -> { overall: { correct, total, percent, pass },
//      groups: [{ topic_id, name, correct, total, unanswered, percent, status }]   by name, "no topic" last
//      review: [{ topic_id, name, status, percent, reason }] }                      weak/fair only, lowest percent first
export function analyzeRows(rows: readonly AnalysisRowInput[], lessonName?: string | null): AnalysisSummary {
  const noTopics = rows.every((r) => r.topic_id == null);
  const byKey = new Map<string | null, { topic_id: string | null; name: string; correct: number; total: number; unanswered: number }>();
  for (const r of rows) {
    const key = noTopics ? null : r.topic_id ?? null;
    let g = byKey.get(key);
    if (!g) {
      const name = noTopics ? lessonName || UNTAGGED_NAME : key === null ? UNTAGGED_NAME : r.topic || UNTAGGED_NAME;
      g = { topic_id: key, name, correct: 0, total: 0, unanswered: 0 };
      byKey.set(key, g);
    }
    g.total += 1;
    if (r.correct) g.correct += 1;
    if (r.unanswered) g.unanswered += 1;
  }
  const groups: AnalysisGroup[] = [...byKey.values()]
    .map((g) => {
      const percent = percentOf(g.correct, g.total);
      return { ...g, percent, status: statusOf(percent) };
    })
    .sort((a, b) => Number(a.topic_id === null) - Number(b.topic_id === null) || a.name.localeCompare(b.name, "th"));
  const review: AnalysisReviewItem[] = groups
    .filter((g) => g.status !== "strong")
    .sort((a, b) => a.percent - b.percent)
    .map((g) => ({ topic_id: g.topic_id, name: g.name, status: g.status, percent: g.percent, reason: reasonOf(g) }));
  const correct = rows.filter((r) => r.correct).length;
  const percent = percentOf(correct, rows.length);
  return { overall: { correct, total: rows.length, percent, pass: percent >= PASS_PERCENT }, groups, review };
}

export interface ScoredRowInput {
  question_id: string;
  chosen: string | null;
  correct: boolean;
  unanswered: boolean;
}

export interface ResultKeyInput {
  id: string;
  answer: string | null;
  topic_id?: string | null;
}

export interface ResultTopicInput {
  id: string;
  name: string;
}

export interface ResultRow extends ScoredRowInput {
  answer: string | null;
  topic_id: string | null;
  topic: string | null;
}

export interface TutorResult {
  version: number;
  rows: ResultRow[];
  analysis: AnalysisSummary;
}

// The object stored in tutor_attempts.result at settle time.
//   rows:   scoreAttempt().rows  [{ question_id, chosen, correct, unanswered }]
//   keys:   [{ id, answer, topic_id }]  live questions of the round (a deleted question has no key)
//   topics: [{ id, name }]              tutor_topics of the lesson
// Each row gets a snapshot of the correct answer id and the topic (id + name). A question with no key (deleted /
// retyped mid-round) has answer null and counts as having no topic.
export function buildResult({
  rows,
  keys,
  topics,
  lessonName,
}: {
  rows: readonly ScoredRowInput[];
  keys: readonly ResultKeyInput[];
  topics: readonly ResultTopicInput[];
  lessonName?: string | null;
}): TutorResult {
  const keyOf = new Map(keys.map((k) => [k.id, k]));
  const nameOf = new Map(topics.map((t) => [t.id, t.name]));
  const full: ResultRow[] = rows.map((r) => {
    const k = keyOf.get(r.question_id);
    const topicId = k?.topic_id ?? null;
    const topic = topicId ? nameOf.get(topicId) ?? null : null;
    return { ...r, answer: k?.answer ?? null, topic_id: topic ? topicId : null, topic };
  });
  return { version: 1, rows: full, analysis: analyzeRows(full, lessonName) };
}

export interface PickBestAttemptInput {
  score: number | null;
  total: number;
  started_at: string;
}

// Best ended attempt: highest score / total (cross-multiplied, rounds can differ in size), tie -> the latest started_at.
// attempts: [{ score, total, started_at }]; rows without a score are ignored. null when there is none.
export function pickBest<T extends PickBestAttemptInput>(attempts: readonly T[]): T | null {
  let best: T | null = null;
  for (const a of attempts) {
    if (a.score == null || !(a.total > 0)) continue;
    if (!best || best.score == null) { best = a; continue; }
    const lhs = a.score * best.total;
    const rhs = best.score * a.total;
    if (lhs > rhs || (lhs === rhs && Date.parse(a.started_at) >= Date.parse(best.started_at))) best = a;
  }
  return best;
}
