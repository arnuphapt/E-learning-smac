import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeLesson, roundsOf, exportRows, weakestGroup } from "../lib/tutor-results.js";

const g = (topic_id, name, correct, total) => ({ topic_id, name, correct, total, percent: Math.floor((correct * 100) / total), status: "x" });
const att = (id, student_id, score, total, startedAt, groups, extra = {}) => ({
  id, student_id, score, total, status: "submitted", started_at: startedAt, submitted_at: startedAt, groups, ...extra,
});
const A = [g("h", "หัวใจ", 2, 2), g("k", "ไต", 0, 2)];

test("empty input: no students, null average, nothing else", () => {
  const s = summarizeLesson([]);
  assert.deepEqual(s, { inProgress: 0, rounds: 0, students: [], avgBest: null, spread: { weak: 0, fair: 0, strong: 0 }, topics: [] });
});

test("best round per student: highest score/total, rounds of different size cross-multiplied, tie -> latest", () => {
  const s = summarizeLesson([
    att("a1", "s1", 2, 4, "2026-10-01T00:00:00Z", A), // 50%
    att("a2", "s1", 3, 4, "2026-10-02T00:00:00Z", A), // 75%
    att("a3", "s1", 4, 10, "2026-10-03T00:00:00Z", A), // 40%
    att("b1", "s2", 1, 2, "2026-10-01T00:00:00Z", A), // 50%
    att("b2", "s2", 2, 4, "2026-10-02T00:00:00Z", A), // 50% tie -> later wins
  ]);
  const by = Object.fromEntries(s.students.map((x) => [x.student_id, x]));
  assert.equal(by.s1.best.id, "a2");
  assert.equal(by.s1.rounds, 3);
  assert.equal(by.s2.best.id, "b2");
  assert.equal(s.rounds, 5);
  assert.equal(by.s1.latestAt, "2026-10-03T00:00:00Z");
});

test("average of each student's BEST percent (not of all rounds); spread uses 60/70 bands; weakest student first", () => {
  const s = summarizeLesson([
    att("a1", "s1", 1, 4, "2026-10-01T00:00:00Z", A), // 25 (not best)
    att("a2", "s1", 4, 4, "2026-10-02T00:00:00Z", A), // 100
    att("b1", "s2", 3, 5, "2026-10-01T00:00:00Z", A), // 60 fair
    att("c1", "s3", 1, 4, "2026-10-01T00:00:00Z", A), // 25 weak
  ]);
  assert.equal(s.avgBest, Math.round((100 + 60 + 25) / 3));
  assert.deepEqual(s.spread, { weak: 1, fair: 1, strong: 1 });
  assert.deepEqual(s.students.map((x) => x.student_id), ["s3", "s2", "s1"]);
});

test("class topics sum correct/total over best rounds only, lowest percent first", () => {
  const s = summarizeLesson([
    att("a1", "s1", 2, 4, "2026-10-01T00:00:00Z", [g("h", "หัวใจ", 0, 2), g("k", "ไต", 2, 2)]), // worse round, ignored
    att("a2", "s1", 3, 4, "2026-10-02T00:00:00Z", [g("h", "หัวใจ", 2, 2), g("k", "ไต", 1, 2)]),
    att("b1", "s2", 2, 4, "2026-10-01T00:00:00Z", [g("h", "หัวใจ", 1, 2), g("k", "ไต", 1, 2)]),
  ]);
  assert.deepEqual(s.topics.map((t) => [t.name, t.correct, t.total, t.percent, t.status, t.students]), [
    ["ไต", 2, 4, 50, "weak", 2],
    ["หัวใจ", 3, 4, 75, "strong", 2],
  ]);
});

test("untagged questions are one class topic named ไม่ระบุหัวข้อ", () => {
  const s = summarizeLesson([att("a1", "s1", 1, 2, "2026-10-01T00:00:00Z", [g(null, "บทที่ 1", 1, 2)])]);
  assert.equal(s.topics[0].name, "ไม่ระบุหัวข้อ");
  assert.equal(s.topics[0].topic_id, null);
});

test("in-progress rounds are only counted; rounds without a result are ignored", () => {
  const s = summarizeLesson([
    att("a1", "s1", null, 4, "2026-10-01T00:00:00Z", null, { status: "in_progress", submitted_at: null }),
    att("a2", "s2", 3, 4, "2026-10-01T00:00:00Z", null), // ended but no stored result yet
    att("a3", "s3", 3, 4, "2026-10-01T00:00:00Z", A, { status: "expired" }),
  ]);
  assert.equal(s.inProgress, 1);
  assert.equal(s.rounds, 1);
  assert.deepEqual(s.students.map((x) => x.student_id), ["s3"]);
});

test("weakest topic of a round: lowest percent, ties by name; null when no groups", () => {
  assert.equal(weakestGroup(A).name, "ไต");
  assert.equal(weakestGroup([g("a", "ข", 1, 2), g("b", "ก", 1, 2)]).name, "ก");
  assert.equal(weakestGroup([]), null);
  assert.equal(weakestGroup(null), null);
});

test("roundsOf numbers one student's ended rounds oldest first", () => {
  const all = [
    att("a2", "s1", 3, 4, "2026-10-02T00:00:00Z", A),
    att("a1", "s1", 2, 4, "2026-10-01T00:00:00Z", A),
    att("x", "s2", 1, 4, "2026-10-01T00:00:00Z", A),
    att("a3", "s1", null, 4, "2026-10-03T00:00:00Z", null, { status: "in_progress" }),
  ];
  assert.deepEqual(roundsOf(all, "s1").map((r) => [r.id, r.number, r.percent]), [["a1", 1, 50], ["a2", 2, 75]]);
});

test("exportRows: one row per student with best score, rounds and a % column per class topic", () => {
  const s = summarizeLesson([
    att("a1", "s1", 2, 4, "2026-10-01T05:00:00Z", A),
    att("b1", "s2", 1, 2, "2026-10-01T05:00:00Z", [g("h", "หัวใจ", 1, 2)]), // no "ไต" in this round
  ]);
  const rows = exportRows(s, new Map([["s1", { name: "ก", email: "a@x", student_no: "650001" }]]));
  assert.equal(rows.length, 2);
  const r1 = rows.find((r) => r["ชื่อ-นามสกุล"] === "ก");
  assert.deepEqual(r1, {
    "รหัสนักศึกษา": "650001", "ชื่อ-นามสกุล": "ก", "อีเมล": "a@x", "จำนวนรอบ": 1, "คะแนนดีที่สุด": 2, "เต็ม": 4, "ร้อยละ": 50,
    "ทำล่าสุด": "2026-10-01", "หัวข้อ: ไต": 0, "หัวข้อ: หัวใจ": 100,
  });
  const r2 = rows.find((r) => r["ชื่อ-นามสกุล"] === "-"); // unknown user
  assert.equal(r2["หัวข้อ: ไต"], "");
  assert.equal(r2["หัวข้อ: หัวใจ"], 50);
});
