// Pure aggregation for the instructor "results" tab of a tutor set. No imports from the app, no DOM: safe for the browser and node --test.
// Thresholds (60 / 70) come from lib/tutor-analysis.js; nothing here is configurable.
import { percentOf, statusOf, pickBest, UNTAGGED_NAME, type AnalysisStatus } from "./tutor-analysis.ts";
import { emailDomain, DEFAULT_DOMAIN } from "./course-access.ts";

export interface ResultAttemptGroup {
  topic_id: string | null;
  name: string;
  correct: number;
  total: number;
  percent: number;
  status?: string;
}

export interface ResultAttemptInput {
  id: string;
  student_id: string;
  score: number | null;
  total: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  deadline_at?: string | null;
  groups?: readonly ResultAttemptGroup[] | null;
}

type EndedAttempt = ResultAttemptInput & {
  score: number;
  groups: readonly ResultAttemptGroup[];
};

export interface StudentLessonSummary {
  student_id: string;
  rounds: number;
  best: {
    id: string;
    score: number;
    total: number;
    percent: number;
    status: AnalysisStatus;
    groups: readonly ResultAttemptGroup[];
    seconds: number | null;
  };
  latestAt: string;
  weakest: ResultAttemptGroup | null;
}

export interface ClassTopicSummary {
  key: string;
  topic_id: string | null;
  name: string;
  correct: number;
  total: number;
  students: number;
  percent: number;
  status: AnalysisStatus;
}

export interface LessonSummary {
  inProgress: number;
  rounds: number;
  students: StudentLessonSummary[];
  avgBest: number | null;
  spread: Record<AnalysisStatus, number>;
  topics: ClassTopicSummary[];
}

export interface StudentRoundSummary {
  id: string;
  number: number;
  score: number;
  total: number;
  percent: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  seconds: number | null;
}

export interface ResultUserRow {
  name?: string | null;
  email?: string | null;
  student_no?: string | null;
}

// attempts: rows of tutor_attempts of ONE lesson
//   { id, student_id, score, total, status, started_at, submitted_at, groups }
//   groups = result.analysis.groups of the round ([{ topic_id, name, correct, total, percent, status }]), null while running
// An ended round counts only when it is not in_progress, has a score and a stored result (groups).
const isEnded = (a: ResultAttemptInput): a is EndedAttempt =>
  a.status !== "in_progress" && a.score != null && a.total > 0 && Array.isArray(a.groups);

// Time a round took, in whole seconds: started_at -> submitted_at, never past deadline_at (an expired round is stamped with
// submitted_at = deadline_at; the cap also covers a late submit). null when the round has no end stamp yet. No stored column:
// all three timestamps already exist on tutor_attempts.
export function timeUsedSeconds(a: Pick<ResultAttemptInput, "started_at" | "submitted_at" | "deadline_at"> | null | undefined): number | null {
  if (!a?.started_at || !a?.submitted_at) return null;
  const end = Math.min(Date.parse(a.submitted_at), a.deadline_at ? Date.parse(a.deadline_at) : Infinity);
  const sec = Math.round((end - Date.parse(a.started_at)) / 1000);
  return Number.isFinite(sec) ? Math.max(0, sec) : null;
}

// "m:ss" for tables ("—" when unknown); minutes are not capped at 59 (a 3-hour round reads 180:00).
export function formatClock(sec: number | null | undefined): string {
  if (sec == null) return "—";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// "X นาที Y วินาที" for the side panel ("Y วินาที" under a minute).
export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  return m > 0 ? `${m} นาที ${sec % 60} วินาที` : `${sec} วินาที`;
}

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name, "th");

// Lowest-percent topic of one round (ties: by name), or null.
export function weakestGroup<T extends { name: string; percent: number }>(
  groups: readonly T[] | null | undefined
): T | null {
  if (!groups?.length) return null;
  return [...groups].sort((a, b) => a.percent - b.percent || byName(a, b))[0];
}

// -> {
//   inProgress: number            rounds still running (counted, never scored)
//   rounds: number                ended rounds, all students
//   students: [{ student_id, rounds, best: { id, score, total, percent, status, groups, seconds }, latestAt, weakest }]
//        best.seconds = time the best round took (timeUsedSeconds), null when unknown
//        best = pickBest (highest score/total, tie -> latest). latestAt = newest ended round (submitted_at, else started_at).
//        sorted by best percent ascending (weakest first), then student_id
//   avgBest: number | null        mean of every student's best percent, rounded; null with no students
//   spread: { weak, fair, strong } students per best-percent band
//   topics: [{ key, topic_id, name, correct, total, percent, status, students }]
//        class-wide: correct/total summed over each student's BEST round only, lowest percent first
// }
export function summarizeLesson(attempts: readonly ResultAttemptInput[]): LessonSummary {
  const ended = attempts.filter(isEnded);
  const perStudent = new Map<string, EndedAttempt[]>();
  for (const a of ended) {
    let list = perStudent.get(a.student_id);
    if (!list) {
      list = [];
      perStudent.set(a.student_id, list);
    }
    list.push(a);
  }

  const students: StudentLessonSummary[] = [];
  for (const [student_id, list] of perStudent) {
    const b = pickBest(list);
    if (!b) continue;
    const percent = percentOf(b.score, b.total);
    const latestAt = list.map((a) => a.submitted_at || a.started_at).sort().at(-1) ?? "";
    students.push({
      student_id,
      rounds: list.length,
      best: { id: b.id, score: b.score, total: b.total, percent, status: statusOf(percent), groups: b.groups, seconds: timeUsedSeconds(b) },
      latestAt,
      weakest: weakestGroup(b.groups),
    });
  }
  students.sort((a, b) => a.best.percent - b.best.percent || (a.student_id < b.student_id ? -1 : 1));

  const spread: Record<AnalysisStatus, number> = { weak: 0, fair: 0, strong: 0 };
  for (const s of students) spread[s.best.status] += 1;
  const avgBest = students.length ? Math.round(students.reduce((n, s) => n + s.best.percent, 0) / students.length) : null;

  const agg = new Map<string, { key: string; topic_id: string | null; name: string; correct: number; total: number; students: number }>();
  for (const s of students) {
    for (const g of s.best.groups) {
      const key = g.topic_id ?? "";
      let t = agg.get(key);
      if (!t) {
        t = { key, topic_id: g.topic_id ?? null, name: g.topic_id ? g.name : UNTAGGED_NAME, correct: 0, total: 0, students: 0 };
        agg.set(key, t);
      }
      t.correct += g.correct;
      t.total += g.total;
      t.students += 1;
    }
  }
  const topics: ClassTopicSummary[] = [...agg.values()]
    .map((t) => {
      const percent = percentOf(t.correct, t.total);
      return { ...t, percent, status: statusOf(percent) };
    })
    .sort((a, b) => a.percent - b.percent || byName(a, b));

  return {
    inProgress: attempts.filter((a) => a.status === "in_progress").length,
    rounds: ended.length,
    students,
    avgBest,
    spread,
    topics,
  };
}

// Rounds of one student, oldest first, numbered like the student's own result page (1..n).
export function roundsOf(attempts: readonly ResultAttemptInput[], studentId: string): StudentRoundSummary[] {
  return attempts
    .filter((a): a is EndedAttempt => a.student_id === studentId && isEnded(a))
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
    .map((a, i) => ({
      id: a.id,
      number: i + 1,
      score: a.score,
      total: a.total,
      percent: percentOf(a.score, a.total),
      status: a.status,
      startedAt: a.started_at,
      submittedAt: a.submitted_at,
      seconds: timeUsedSeconds(a),
    }));
}

// Excel rows of one lesson: one row per student, then one column per topic of the class ("หัวข้อ: name", best round % or "" when
// that round had no such topic). users: Map id -> { name, email, student_no }.
export function exportRows(
  summary: LessonSummary,
  users: ReadonlyMap<string, ResultUserRow>
): Record<string, string | number>[] {
  const cols = summary.topics.map((t) => ({ key: t.key, header: "หัวข้อ: " + t.name }));
  return summary.students.map((s) => {
    const u = users.get(s.student_id) || {};
    const row: Record<string, string | number> = {
      "รหัสนักศึกษา": u.student_no || "-",
      "โดเมน": emailDomain(u.email) || "-",
      "ชื่อ-นามสกุล": u.name || "-",
      "อีเมล": u.email || "-",
      "จำนวนรอบ": s.rounds,
      "คะแนนดีที่สุด": s.best.score,
      "เต็ม": s.best.total,
      "ร้อยละ": s.best.percent,
      "เวลาที่ใช้ (นาที)": s.best.seconds == null ? "" : Math.round(s.best.seconds / 6) / 10, // best round, 1 decimal
      "ทำล่าสุด": s.latestAt ? new Date(s.latestAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : "",
    };
    for (const c of cols) {
      const g = s.best.groups.find((x) => (x.topic_id ?? "") === c.key);
      row[c.header] = g ? g.percent : "";
    }
    return row;
  });
}

// Domain filter of the results tab. users: Map id -> { email }. Students without an email have no domain: they only show under "all".
// Domains present among `users` with their student counts, DEFAULT_DOMAIN first, the rest alphabetical: [[domain, count], ...].
export function domainCounts(users: ReadonlyMap<string, { email?: string | null }>): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const u of users.values()) {
    const d = emailDomain(u.email);
    if (d) m.set(d, (m.get(d) || 0) + 1);
  }
  return [...m].sort((a, b) => Number(b[0] === DEFAULT_DOMAIN) - Number(a[0] === DEFAULT_DOMAIN) || a[0].localeCompare(b[0]));
}

// Attempt rows of the students of one domain ("" = no filter). Filter BEFORE summarizeLesson so every figure follows.
export const filterByDomain = <T extends { student_id: string }>(
  attempts: readonly T[],
  users: ReadonlyMap<string, { email?: string | null }>,
  domain: string
): readonly T[] =>
  domain ? attempts.filter((a) => emailDomain(users.get(a.student_id)?.email) === domain) : attempts;
