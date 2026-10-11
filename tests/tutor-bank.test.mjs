import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTopic, findTopic, bankWarning, parseDrawCount, lockSummary, visibleTutorSets, filterBank, topicNames } from "../lib/tutor-bank.js";

test("topics are reused by trimmed, case-insensitive name", () => {
  const topics = [{ id: "t1", name: "Heart failure" }];
  assert.equal(findTopic(topics, "  heart FAILURE ")?.id, "t1");
  assert.equal(findTopic(topics, "Arrhythmia"), null);
  assert.equal(findTopic(topics, "   "), null);
  assert.equal(normalizeTopic("  x "), "x");
  assert.equal(normalizeTopic(null), "");
});

test("bank warning: empty bank, short bank, enough, whole bank", () => {
  assert.match(bankWarning(0, null), /ว่าง/);
  assert.match(bankWarning(0, 10), /ว่าง/);
  assert.match(bankWarning(5, 10), /5 ข้อ.*10 ข้อ/);
  assert.equal(bankWarning(10, 10), null);
  assert.equal(bankWarning(12, 10), null);
  assert.equal(bankWarning(3, null), null);
});

test("draw count input: blank = whole bank, positive integer ok, rest invalid", () => {
  assert.equal(parseDrawCount(""), null);
  assert.equal(parseDrawCount("  "), null);
  assert.equal(parseDrawCount("20"), 20);
  assert.equal(parseDrawCount("0"), undefined);
  assert.equal(parseDrawCount("-3"), undefined);
  assert.equal(parseDrawCount("2.5"), undefined);
  assert.equal(parseDrawCount("abc"), undefined);
});

test("lock summary: no lock means nobody (tutor sets fail closed), any lock opens the set", () => {
  assert.equal(lockSummary({ year_level: [], section: null, access: { allowedEmails: [] } }).open, false);
  assert.equal(lockSummary({ year_level: [], section: "ไม่ระบุ Section", access: {} }).open, false);
  assert.match(lockSummary({ year_level: [], access: {} }).text, /ไม่มีนักศึกษา/);
  assert.deepEqual(lockSummary({ year_level: [3, 2], section: "A", access: { allowedEmails: ["a@x"] } }), { open: true, text: "ชั้นปี 2, 3 · A · 1 อีเมลพิเศษ" });
  assert.equal(lockSummary({ access: { allowedEmails: ["a@x"] } }).text, "1 อีเมลพิเศษ");
});

test("visibleTutorSets: admin all, manager by group, instructor by assignment, others none", () => {
  const sets = [{ id: "a", group_id: "g1" }, { id: "b", group_id: "g2" }, { id: "c", group_id: null }];
  const ids = (u, mine) => visibleTutorSets(sets, u, mine).map((s) => s.id);
  assert.deepEqual(ids({ role: "admin" }, []), ["a", "b", "c"]);
  assert.deepEqual(ids({ role: "course_manager", group_id: "g1" }, []), ["a"]);
  assert.deepEqual(ids({ role: "course_manager", group_ids: ["g2"] }, []), ["b"]);
  assert.deepEqual(ids({ role: "instructor" }, ["c"]), ["c"]);
  assert.deepEqual(ids({ role: "student" }, ["a"]), []);
  assert.deepEqual(ids({ role: "tutor_guest" }, ["a"]), []);
});

test("filterBank / topicNames: set, lesson, topic (normalized), text search", () => {
  const rows = [
    { id: "1", setId: "s1", lessonId: "l1", topic: "Heart", text: "ภาวะหัวใจล้มเหลว" },
    { id: "2", setId: "s1", lessonId: "l2", topic: " heart ", text: "Arrhythmia" },
    { id: "3", setId: "s2", lessonId: "l3", topic: "", text: "ไต" },
  ];
  const ids = (f) => filterBank(rows, f).map((r) => r.id);
  assert.deepEqual(ids({}), ["1", "2", "3"]);
  assert.deepEqual(ids({ setId: "s1" }), ["1", "2"]);
  assert.deepEqual(ids({ setId: "s1", lessonId: "l2" }), ["2"]);
  assert.deepEqual(ids({ topic: "HEART" }), ["1", "2"]);
  assert.deepEqual(ids({ q: " ARRHY " }), ["2"]);
  assert.deepEqual(ids({ setId: "s2", topic: "Heart" }), []);
  assert.deepEqual(topicNames(rows), ["Heart"]);
});
