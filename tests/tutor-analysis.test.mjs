import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRows, buildResult, pickBest, percentOf, statusOf, PASS_PERCENT, STRONG_PERCENT } from "../lib/tutor-analysis.js";

// `correct` right + (total - correct) wrong rows of one topic
const topicRows = (correct, total, topic_id = "t1", topic = "หัวข้อ 1") =>
  Array.from({ length: total }, (_, i) => ({ topic_id, topic, correct: i < correct, unanswered: false }));
const only = (rows) => analyzeRows(rows, "บทที่ 1").groups[0];

test("thresholds are the fixed constants 60 / 70", () => {
  assert.equal(PASS_PERCENT, 60);
  assert.equal(STRONG_PERCENT, 70);
});

test("edge values 59 / 60 / 69 / 70 land on the right side", () => {
  const cases = [
    [59, 100, 59, "weak"],
    [3, 5, 60, "fair"],
    [60, 100, 60, "fair"],
    [69, 100, 69, "fair"],
    [7, 10, 70, "strong"],
    [70, 100, 70, "strong"],
  ];
  for (const [c, t, percent, status] of cases) {
    const g = only(topicRows(c, t));
    assert.equal(g.percent, percent, `${c}/${t} percent`);
    assert.equal(g.status, status, `${c}/${t} status`);
  }
});

test("percent is floored: 59.5% is 59 weak (not a 60% with a weak badge), 69.5% is 69 fair", () => {
  assert.equal(percentOf(119, 200), 59);
  assert.equal(statusOf(percentOf(119, 200)), "weak");
  assert.equal(percentOf(139, 200), 69);
  assert.equal(statusOf(percentOf(139, 200)), "fair");
  assert.equal(percentOf(2, 3), 66);
  assert.equal(percentOf(0, 0), 0);
  // the displayed percent and the badge can never disagree: badge from floor == badge from the exact fraction
  for (let t = 1; t <= 40; t++) {
    for (let c = 0; c <= t; c++) {
      const exact = c * 100 >= STRONG_PERCENT * t ? "strong" : c * 100 >= PASS_PERCENT * t ? "fair" : "weak";
      assert.equal(statusOf(percentOf(c, t)), exact, `${c}/${t}`);
    }
  }
});

test("an unanswered question is wrong in the percent and shows in the reason", () => {
  const rows = [
    { topic_id: "t1", topic: "A", correct: true, unanswered: false },
    { topic_id: "t1", topic: "A", correct: true, unanswered: false },
    { topic_id: "t1", topic: "A", correct: false, unanswered: true },
    { topic_id: "t1", topic: "A", correct: false, unanswered: true },
  ];
  const r = analyzeRows(rows, "บท");
  assert.equal(r.groups[0].percent, 50);
  assert.equal(r.groups[0].unanswered, 2);
  assert.equal(r.groups[0].status, "weak");
  assert.match(r.review[0].reason, /ตอบถูก 2 จาก 4 ข้อ \(50%\) ต่ำกว่าเกณฑ์ 60% · ไม่ได้ตอบ 2 ข้อ/);
});

test("a lesson with no topics gives one per-lesson group", () => {
  const rows = [
    { topic_id: null, topic: null, correct: true, unanswered: false },
    { topic_id: null, topic: null, correct: false, unanswered: false },
    { topic_id: null, topic: null, correct: true, unanswered: false },
  ];
  const r = analyzeRows(rows, "บทที่ 3 การพยาบาล");
  assert.equal(r.groups.length, 1);
  assert.deepEqual(r.groups[0], { topic_id: null, name: "บทที่ 3 การพยาบาล", correct: 2, total: 3, unanswered: 0, percent: 66, status: "fair" });
});

test("untagged questions next to tagged ones form their own group, last", () => {
  const rows = [...topicRows(1, 1, "t2", "ก"), { topic_id: null, topic: null, correct: false, unanswered: false }, ...topicRows(0, 1, "t1", "ข")];
  const names = analyzeRows(rows, "บท").groups.map((g) => g.name);
  assert.deepEqual(names, ["ก", "ข", "ไม่ระบุหัวข้อ"]);
});

test("review list: weak and fair only, lowest percent first, strong left out", () => {
  const rows = [...topicRows(9, 10, "s", "แข็ง"), ...topicRows(6, 10, "f", "กลาง"), ...topicRows(2, 10, "w", "อ่อน")];
  const r = analyzeRows(rows, "บท");
  assert.deepEqual(r.review.map((x) => [x.name, x.status, x.percent]), [["อ่อน", "weak", 20], ["กลาง", "fair", 60]]);
  assert.match(r.review[1].reason, /ผ่านแล้ว แต่ยังไม่ถึง 70%/);
  assert.deepEqual(analyzeRows(topicRows(10, 10), "บท").review, []);
});

test("overall: pass from 60% up, with the same floor", () => {
  assert.equal(analyzeRows(topicRows(59, 100), "บท").overall.pass, false);
  assert.equal(analyzeRows(topicRows(3, 5), "บท").overall.pass, true);
  assert.deepEqual(analyzeRows(topicRows(3, 5), "บท").overall, { correct: 3, total: 5, percent: 60, pass: true });
});

test("buildResult snapshots the correct answer and the topic name; a deleted question has neither", () => {
  const rows = [
    { question_id: "q1", chosen: "a", correct: true, unanswered: false },
    { question_id: "q2", chosen: null, correct: false, unanswered: true },
    { question_id: "q3", chosen: "c", correct: false, unanswered: false },
  ];
  const keys = [{ id: "q1", answer: "a", topic_id: "t1" }, { id: "q2", answer: "b", topic_id: "t-gone" }];
  const r = buildResult({ rows, keys, topics: [{ id: "t1", name: "หัวข้อ 1" }], lessonName: "บท" });
  assert.deepEqual(r.rows, [
    { question_id: "q1", chosen: "a", correct: true, unanswered: false, answer: "a", topic_id: "t1", topic: "หัวข้อ 1" },
    { question_id: "q2", chosen: null, correct: false, unanswered: true, answer: "b", topic_id: null, topic: null },
    { question_id: "q3", chosen: "c", correct: false, unanswered: false, answer: null, topic_id: null, topic: null },
  ]);
  assert.equal(r.version, 1);
  assert.deepEqual(r.analysis.groups.map((g) => [g.name, g.correct, g.total]), [["หัวข้อ 1", 1, 1], ["ไม่ระบุหัวข้อ", 0, 2]]);
});

test("buildResult with no topics at all falls back to the lesson group", () => {
  const rows = [{ question_id: "q1", chosen: "a", correct: true, unanswered: false }];
  const r = buildResult({ rows, keys: [{ id: "q1", answer: "a", topic_id: null }], topics: [], lessonName: "บทที่ 1" });
  assert.deepEqual(r.analysis.groups.map((g) => g.name), ["บทที่ 1"]);
});

test("pickBest: highest ratio wins, rounds of different size are compared by fraction", () => {
  const a = { id: "a", score: 3, total: 5, started_at: "2026-10-01T00:00:00Z" }; // 0.6
  const b = { id: "b", score: 7, total: 10, started_at: "2026-10-02T00:00:00Z" }; // 0.7
  const c = { id: "c", score: 2, total: 2, started_at: "2026-10-03T00:00:00Z" }; // 1.0
  assert.equal(pickBest([a, b]).id, "b");
  assert.equal(pickBest([a, b, c]).id, "c");
  assert.equal(pickBest([c, b, a]).id, "c");
});

test("pickBest: tie goes to the latest round; unscored rows are ignored; none -> null", () => {
  const a = { id: "a", score: 3, total: 5, started_at: "2026-10-01T00:00:00Z" };
  const b = { id: "b", score: 6, total: 10, started_at: "2026-10-02T00:00:00Z" }; // same 0.6, later
  assert.equal(pickBest([a, b]).id, "b");
  assert.equal(pickBest([b, a]).id, "b");
  assert.equal(pickBest([{ id: "x", score: null, total: 5, started_at: "2026-10-09T00:00:00Z" }, a]).id, "a");
  assert.equal(pickBest([]), null);
  assert.equal(pickBest([{ id: "x", score: null, total: 5, started_at: "2026-10-09T00:00:00Z" }]), null);
});
