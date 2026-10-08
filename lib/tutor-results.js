// Pure aggregation for the instructor "results" tab of a tutor set. No imports from the app, no DOM: safe for the browser and node --test.
// Thresholds (60 / 70) come from lib/tutor-analysis.js; nothing here is configurable.
import { percentOf, statusOf, pickBest, UNTAGGED_NAME } from "./tutor-analysis.js";

// attempts: rows of tutor_attempts of ONE lesson
//   { id, student_id, score, total, status, started_at, submitted_at, groups }
//   groups = result.analysis.groups of the round ([{ topic_id, name, correct, total, percent, status }]), null while running
// An ended round counts only when it is not in_progress, has a score and a stored result (groups).
const isEnded = (a) => a.status !== "in_progress" && a.score != null && a.total > 0 && Array.isArray(a.groups);

const byName = (a, b) => a.name.localeCompare(b.name, "th");

// Lowest-percent topic of one round (ties: by name), or null.
export function weakestGroup(groups) {
  if (!groups?.length) return null;
  return [...groups].sort((a, b) => a.percent - b.percent || byName(a, b))[0];
}

// -> {
//   inProgress: number            rounds still running (counted, never scored)
//   rounds: number                ended rounds, all students
//   students: [{ student_id, rounds, best: { id, score, total, percent, status, groups }, latestAt, weakest }]
//        best = pickBest (highest score/total, tie -> latest). latestAt = newest ended round (submitted_at, else started_at).
//        sorted by best percent ascending (weakest first), then student_id
//   avgBest: number | null        mean of every student's best percent, rounded; null with no students
//   spread: { weak, fair, strong } students per best-percent band
//   topics: [{ key, topic_id, name, correct, total, percent, status, students }]
//        class-wide: correct/total summed over each student's BEST round only, lowest percent first
// }
export function summarizeLesson(attempts) {
  const ended = attempts.filter(isEnded);
  const perStudent = new Map();
  for (const a of ended) {
    if (!perStudent.has(a.student_id)) perStudent.set(a.student_id, []);
    perStudent.get(a.student_id).push(a);
  }

  const students = [];
  for (const [student_id, list] of perStudent) {
    const b = pickBest(list);
    const percent = percentOf(b.score, b.total);
    const latestAt = list.map((a) => a.submitted_at || a.started_at).sort().at(-1);
    students.push({
      student_id,
      rounds: list.length,
      best: { id: b.id, score: b.score, total: b.total, percent, status: statusOf(percent), groups: b.groups },
      latestAt,
      weakest: weakestGroup(b.groups),
    });
  }
  students.sort((a, b) => a.best.percent - b.best.percent || (a.student_id < b.student_id ? -1 : 1));

  const spread = { weak: 0, fair: 0, strong: 0 };
  for (const s of students) spread[s.best.status] += 1;
  const avgBest = students.length ? Math.round(students.reduce((n, s) => n + s.best.percent, 0) / students.length) : null;

  const agg = new Map();
  for (const s of students) {
    for (const g of s.best.groups) {
      const key = g.topic_id ?? "";
      let t = agg.get(key);
      if (!t) agg.set(key, (t = { key, topic_id: g.topic_id ?? null, name: g.topic_id ? g.name : UNTAGGED_NAME, correct: 0, total: 0, students: 0 }));
      t.correct += g.correct;
      t.total += g.total;
      t.students += 1;
    }
  }
  const topics = [...agg.values()]
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
export function roundsOf(attempts, studentId) {
  return attempts
    .filter((a) => a.student_id === studentId && isEnded(a))
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
    .map((a, i) => ({ id: a.id, number: i + 1, score: a.score, total: a.total, percent: percentOf(a.score, a.total), status: a.status, startedAt: a.started_at, submittedAt: a.submitted_at }));
}

// Excel rows of one lesson: one row per student, then one column per topic of the class ("หัวข้อ: name", best round % or "" when
// that round had no such topic). users: Map id -> { name, email, student_no }.
export function exportRows(summary, users) {
  const cols = summary.topics.map((t) => ({ key: t.key, header: "หัวข้อ: " + t.name }));
  return summary.students.map((s) => {
    const u = users.get(s.student_id) || {};
    const row = {
      "รหัสนักศึกษา": u.student_no || "-",
      "ชื่อ-นามสกุล": u.name || "-",
      "อีเมล": u.email || "-",
      "จำนวนรอบ": s.rounds,
      "คะแนนดีที่สุด": s.best.score,
      "เต็ม": s.best.total,
      "ร้อยละ": s.best.percent,
      "ทำล่าสุด": s.latestAt ? new Date(s.latestAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : "",
    };
    for (const c of cols) {
      const g = s.best.groups.find((x) => (x.topic_id ?? "") === c.key);
      row[c.header] = g ? g.percent : "";
    }
    return row;
  });
}
