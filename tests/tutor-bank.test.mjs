import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTopic, findTopic, bankWarning, parseDrawCount } from "../lib/tutor-bank.js";

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
