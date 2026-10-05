import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUMMARY_SCHEMA, buildSummaryInput, parseSummary, isFinalSummary, stripEmotionTags,
  buildExplainSystem, EXPLAIN_CORE_RULES, DEFAULT_PERSONA_EXPLAIN, toExplainContents, explainGate,
} from "../lib/tutor-prompt.js";
import { buildResult } from "../lib/tutor-analysis.js";

// one round: q1 right (topic A), q2 wrong (A), q3 not answered (B)
const questions = {
  q1: { id: "q1", text: "ข้อหนึ่ง", choices: [{ id: "a", text: "ก1" }, { id: "b", text: "ข1" }], explanation: "เพราะ ก1 ถูก" },
  q2: { id: "q2", text: "ข้อสอง", choices: [{ id: "a", text: "ก2" }, { id: "b", text: "ข2" }], explanation: "อาจารย์บอกว่า ข2" },
  q3: { id: "q3", text: "ข้อสาม", choices: [{ id: "a", text: "ก3" }, { id: "b", text: "ข3" }], explanation: "" },
};
const rows = [
  { question_id: "q1", chosen: "a", correct: true, unanswered: false },
  { question_id: "q2", chosen: "a", correct: false, unanswered: false },
  { question_id: "q3", chosen: null, correct: false, unanswered: true },
];
const keys = [{ id: "q1", answer: "a", topic_id: "tA" }, { id: "q2", answer: "b", topic_id: "tA" }, { id: "q3", answer: "a", topic_id: "tB" }];
const topics = [{ id: "tA", name: "หัวข้อ A" }, { id: "tB", name: "หัวข้อ B" }];
const result = buildResult({ rows, keys, topics, lessonName: "บทที่ 1" });

test("summary input carries the code-computed numbers AND every per-question answer", () => {
  const t = buildSummaryInput({ lessonTitle: "บทที่ 1", result, questions });
  assert.match(t, /คะแนนรวม: 1\/3 \(33%\) ไม่ผ่าน/);
  assert.match(t, /หัวข้อ A: ถูก 1\/2 ข้อ \(50%\) จุดอ่อน/);
  assert.match(t, /หัวข้อ B: ถูก 0\/1 ข้อ \(0%\) จุดอ่อน ไม่ได้ตอบ 1 ข้อ/);
  // per-question: what the student picked, the key, and the status, not only topic percentages
  assert.match(t, /ข้อ 1 \[หัวข้อ A\] ถูก/);
  assert.match(t, /ข้อ 2 \[หัวข้อ A\] ผิด\n {2}โจทย์: ข้อสอง\n {2}นักศึกษาตอบ: ก2\n {2}เฉลย: ข2/);
  assert.match(t, /ข้อ 3 \[หัวข้อ B\] ไม่ได้ตอบ\n {2}โจทย์: ข้อสาม\n {2}นักศึกษาตอบ: ไม่ได้ตอบ\n {2}เฉลย: ก3/);
  // the teacher explanation is passed for the missed ones only
  assert.match(t, /คำอธิบายของอาจารย์: อาจารย์บอกว่า ข2/);
  assert.doesNotMatch(t, /เพราะ ก1 ถูก/);
});

test("summary input survives a deleted question", () => {
  const t = buildSummaryInput({ lessonTitle: "x", result, questions: { q1: questions.q1 } });
  assert.match(t, /\(ข้อนี้ถูกลบแล้ว\)/);
});

test("summary schema is a JSON schema with the three required fields", () => {
  assert.equal(SUMMARY_SCHEMA.type, "object");
  assert.deepEqual(SUMMARY_SCHEMA.required, ["overview", "topic_notes", "next_steps"]);
  assert.equal(SUMMARY_SCHEMA.properties.overview.type, "string");
  assert.equal(SUMMARY_SCHEMA.properties.topic_notes.type, "array");
  assert.deepEqual(SUMMARY_SCHEMA.properties.topic_notes.items.required, ["topic", "comment"]);
  assert.equal(SUMMARY_SCHEMA.properties.next_steps.items.type, "string");
  assert.doesNotThrow(() => JSON.stringify(SUMMARY_SCHEMA));
});

test("parseSummary accepts the schema shape, trims it, and rejects anything else", () => {
  const ok = parseSummary(JSON.stringify({ overview: "ภาพรวม [emotion: smile]", topic_notes: [{ topic: "A", comment: "ข้อ 2" }, { nope: 1 }], next_steps: ["ก", "", "ข", "ค", "ง", "จ", "ฉ"] }));
  assert.deepEqual(ok, { overview: "ภาพรวม", topic_notes: [{ topic: "A", comment: "ข้อ 2" }], next_steps: ["ก", "ข", "ค", "ง", "จ"] });
  assert.equal(parseSummary("not json"), null);
  assert.equal(parseSummary(JSON.stringify({ topic_notes: [] })), null);
  assert.equal(parseSummary(JSON.stringify({ overview: "  " })), null);
  assert.equal(parseSummary(undefined), null);
});

test("isFinalSummary tells a stored summary from the generating claim and from NULL", () => {
  assert.equal(isFinalSummary(null), false);
  assert.equal(isFinalSummary({ pending: true, at: "2026-10-06T10:00:00.000Z" }), false);
  assert.equal(isFinalSummary({ overview: "x", topic_notes: [], next_steps: [] }), true);
});

test("stripEmotionTags removes every [emotion: ...] tag, any case and spacing", () => {
  assert.equal(stripEmotionTags("ตอบแล้ว [emotion: smile]"), "ตอบแล้ว");
  assert.equal(stripEmotionTags("[Emotion:mad] a [ emotion : idle ] b"), "a  b");
  assert.equal(stripEmotionTags("ไม่มีแท็ก [อ้างอิง 1]"), "ไม่มีแท็ก [อ้างอิง 1]");
  assert.equal(stripEmotionTags(undefined), "");
});

test("explain prompt has the three layers in order: core rules, persona, question context", () => {
  const sys = buildExplainSystem({ persona: "[บทบาท] พูดเหมือนพี่สาว", lessonTitle: "บทที่ 1", questionId: "q2", rows: result.rows, questions });
  const core = sys.indexOf(EXPLAIN_CORE_RULES);
  const persona = sys.indexOf("พูดเหมือนพี่สาว");
  const ctx = sys.indexOf("[ข้อมูลข้อสอบ]");
  assert.ok(core === 0 && persona > core && ctx > persona);
  // question context: stem, choices, the student's pick, the key, the teacher's explanation, topic, whole attempt
  assert.match(sys, /ข้อที่นักศึกษากำลังถาม: ข้อ 2 หัวข้อ: หัวข้อ A/);
  assert.match(sys, /โจทย์: ข้อสอง/);
  assert.match(sys, /- ก2\n- ข2/);
  assert.match(sys, /นักศึกษาเลือก: ก2 \(ผิด\)/);
  assert.match(sys, /เฉลย: ข2\n/);
  assert.match(sys, /คำอธิบายของอาจารย์: อาจารย์บอกว่า ข2/);
  assert.match(sys, /คำตอบทั้งรอบของนักศึกษา:\n- ข้อ 1 .*ถูก.*\n- ข้อ 2 .*ผิด.*\n- ข้อ 3 .*ไม่ได้ตอบ/);
});

test("explain core rules: teacher wins, other view + ask the teacher, same-lesson questions allowed, no emotion tags", () => {
  assert.match(EXPLAIN_CORE_RULES, /คำอธิบายของอาจารย์.*เป็นหลัก/);
  assert.match(EXPLAIN_CORE_RULES, /ยึดของอาจารย์ บอกว่าอาจมีมุมมองอื่น และแนะนำให้ถามอาจารย์/);
  assert.match(EXPLAIN_CORE_RULES, /ถามนอกข้อนี้ได้ ถ้ายังอยู่ในเรื่องของบทเรียนเดียวกัน/);
  assert.match(EXPLAIN_CORE_RULES, /ห้ามใส่แท็ก \[emotion/);
});

test("explain prompt: empty persona falls back to the code default; missing teacher explanation is stated", () => {
  const sys = buildExplainSystem({ persona: "  ", lessonTitle: "บท", questionId: "q3", rows: result.rows, questions });
  assert.ok(sys.includes(DEFAULT_PERSONA_EXPLAIN));
  assert.match(sys, /นักศึกษาเลือก: ไม่ได้ตอบ \(ไม่ได้ตอบ\)/);
  assert.match(sys, /คำอธิบายของอาจารย์: ยังไม่มี/);
});

test("the explain prompt never asks for emotion tags (only forbids them)", () => {
  const sys = buildExplainSystem({ persona: "", lessonTitle: "บท", questionId: "q1", rows: result.rows, questions });
  assert.doesNotMatch(sys, /Append/);
  assert.doesNotMatch(sys, /\[emotion: (smile|mad|idle|impressive)\]/);
});

test("toExplainContents: roles remapped, clipped, last turn must be the student's, history starts with a user turn", () => {
  const long = "ก".repeat(1500);
  const c = toExplainContents([{ role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: long }]);
  assert.deepEqual(c.map((x) => x.role), ["user", "model", "user"]);
  assert.equal(c[2].parts[0].text.length, 1001);
  assert.equal(toExplainContents([{ role: "user", content: "a" }, { role: "assistant", content: "b" }]), null);
  assert.equal(toExplainContents([]), null);
  assert.equal(toExplainContents([{ role: "user", content: "" }]), null);
  assert.equal(toExplainContents("x"), null);
  const many = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "m" + i }));
  many.push({ role: "user", content: "last" }); // 11 turns: user, model, ... user, user
  const t = toExplainContents(many);
  assert.equal(t[0].role, "user");
  assert.equal(t.at(-1).parts[0].text, "last");
  assert.ok(t.length <= 7);
});

const attempt = (over = {}) => ({ id: "at1", student_id: "s1", status: "submitted", question_ids: ["q1", "q2"], ...over });

test("explain gate: ended + own + question in the attempt is the only way through", () => {
  assert.deepEqual(explainGate({ attempt: attempt(), studentId: "s1", questionId: "q2" }), { ok: true });
  assert.deepEqual(explainGate({ attempt: attempt({ status: "expired" }), studentId: "s1", questionId: "q1" }), { ok: true });
});

test("explain gate: before submit, someone else's attempt and a question outside the attempt are refused", () => {
  assert.deepEqual(explainGate({ attempt: attempt({ status: "in_progress" }), studentId: "s1", questionId: "q1" }), { ok: false, reason: "not_ended" });
  assert.deepEqual(explainGate({ attempt: attempt(), studentId: "other", questionId: "q1" }), { ok: false, reason: "not_found" });
  assert.deepEqual(explainGate({ attempt: null, studentId: "s1", questionId: "q1" }), { ok: false, reason: "not_found" });
  assert.deepEqual(explainGate({ attempt: attempt(), studentId: "s1", questionId: "q9" }), { ok: false, reason: "not_in_attempt" });
  assert.deepEqual(explainGate({ attempt: attempt(), studentId: "s1", questionId: "" }), { ok: false, reason: "not_in_attempt" });
});
