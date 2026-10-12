import { test } from "node:test";
import assert from "node:assert/strict";
import { canStartAttempt } from "../lib/tutor-attempt.js";

test("unlimited (NULL) lesson: always can start", () => {
  assert.equal(canStartAttempt(null, 0, false), true);
  assert.equal(canStartAttempt(null, 50, false), true);
  assert.equal(canStartAttempt(undefined, 3, false), true);
});

test("once-only lesson: first round yes, after any started round no", () => {
  assert.equal(canStartAttempt(1, 0, false), true);
  assert.equal(canStartAttempt(1, 1, false), false);
  assert.equal(canStartAttempt(1, 2, false), false);
});

test("an open round can always be resumed, even when the limit is used up", () => {
  assert.equal(canStartAttempt(1, 1, true), true);
});

test("limit N: used < N", () => {
  assert.equal(canStartAttempt(3, 2, false), true);
  assert.equal(canStartAttempt(3, 3, false), false);
});

test("round time: NULL keeps 1 minute per question, a lesson setting fixes the whole round", async () => {
  const { roundMinutes, deadlineFor, parseTimeLimit } = await import("../lib/tutor-attempt.js");
  assert.equal(roundMinutes(20, null), 20);
  assert.equal(roundMinutes(20), 20);
  assert.equal(roundMinutes(20, 45), 45);
  assert.equal(deadlineFor(0, 4), new Date(4 * 60000).toISOString()); // default rule unchanged
  assert.equal(deadlineFor(0, 4, null), new Date(4 * 60000).toISOString());
  assert.equal(deadlineFor(0, 4, 30), new Date(30 * 60000).toISOString());
  assert.equal(parseTimeLimit(""), null);
  assert.equal(parseTimeLimit("  "), null);
  assert.equal(parseTimeLimit("45"), 45);
  assert.equal(parseTimeLimit("1"), 1);
  assert.equal(parseTimeLimit("180"), 180);
  for (const bad of ["0", "181", "-5", "1.5", "abc"]) assert.equal(parseTimeLimit(bad), undefined);
});
