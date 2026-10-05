import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreAttempt } from "../lib/tutor-score.js";

const DL = "2026-10-06T10:20:00.000Z";
const keys = [{ id: "q1", answer: "a" }, { id: "q2", answer: "b" }, { id: "q3", answer: "c" }, { id: "q4", answer: "d" }];
const ans = (question_id, chosen, answered_at = "2026-10-06T10:05:00.000Z") => ({ question_id, chosen, answered_at });

test("counts correct answers and returns rows in the locked order", () => {
  const r = scoreAttempt({ questionIds: ["q3", "q1", "q2"], keys, answers: [ans("q1", "a"), ans("q2", "x"), ans("q3", "c")], deadlineAt: DL });
  assert.equal(r.score, 2);
  assert.equal(r.total, 3);
  assert.deepEqual(r.rows, [
    { question_id: "q3", chosen: "c", correct: true, unanswered: false },
    { question_id: "q1", chosen: "a", correct: true, unanswered: false },
    { question_id: "q2", chosen: "x", correct: false, unanswered: false },
  ]);
});

test("unanswered is wrong in the score but labelled unanswered, distinct from a wrong answer", () => {
  const r = scoreAttempt({ questionIds: ["q1", "q2"], keys, answers: [ans("q2", "zzz")], deadlineAt: DL });
  assert.equal(r.score, 0);
  assert.deepEqual(r.rows[0], { question_id: "q1", chosen: null, correct: false, unanswered: true });
  assert.deepEqual(r.rows[1], { question_id: "q2", chosen: "zzz", correct: false, unanswered: false });
});

test("only answers with answered_at <= deadline_at count (the boundary counts, a late one is dropped)", () => {
  const r = scoreAttempt({
    questionIds: ["q1", "q2", "q3"],
    keys,
    answers: [ans("q1", "a", DL), ans("q2", "b", "2026-10-06T10:20:00.001Z"), ans("q3", "c", "2026-10-06T10:19:59.999Z")],
    deadlineAt: DL,
  });
  assert.equal(r.score, 2);
  assert.deepEqual(r.rows[1], { question_id: "q2", chosen: null, correct: false, unanswered: true });
});

test("answers for questions outside the round are ignored; a question with no key is never correct", () => {
  const r = scoreAttempt({ questionIds: ["q1", "gone"], keys, answers: [ans("q1", "a"), ans("gone", "a"), ans("q4", "d")], deadlineAt: DL });
  assert.equal(r.score, 1);
  assert.equal(r.total, 2);
  assert.deepEqual(r.rows[1], { question_id: "gone", chosen: "a", correct: false, unanswered: false });
});

test("a key that is null never matches; empty round scores 0/0", () => {
  const r = scoreAttempt({ questionIds: ["q1"], keys: [{ id: "q1", answer: null }], answers: [ans("q1", "a")], deadlineAt: DL });
  assert.equal(r.score, 0);
  assert.deepEqual(scoreAttempt({ questionIds: [], keys, answers: [], deadlineAt: DL }), { score: 0, total: 0, rows: [] });
});
