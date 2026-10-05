import { test } from "node:test";
import assert from "node:assert/strict";
import { viewVerdict } from "../lib/r2.js";

const student = { sub: "s1", role: "student" };
const staff = { sub: "t1", role: "instructor" };

test("viewVerdict: no token or unsafe key is refused", () => {
  assert.equal(viewVerdict(null, "lessons/L1/video/a.mp4"), false);
  assert.equal(viewVerdict(student, "lessons/L1/video/../ai_documents/a.pdf"), false);
  assert.equal(viewVerdict(student, "lessons/L1/video/%2e%2e/a"), false);
});

test("viewVerdict: staff see everything safe", () => {
  assert.equal(viewVerdict(staff, "lessons/L1/ai_documents/a.pdf"), true);
  assert.equal(viewVerdict(staff, "lessons/L1/video/a.mp4"), true);
});

test("viewVerdict: student lesson video/documents need the course check; AI-only never", () => {
  assert.deepEqual(viewVerdict(student, "lessons/L1/video/a.mp4"), { lessonId: "L1" });
  assert.deepEqual(viewVerdict(student, "lessons/L2/documents/a.pdf"), { lessonId: "L2" });
  assert.equal(viewVerdict(student, "lessons/L1/ai_documents/a.pdf"), false);
});

test("viewVerdict: other prefixes unchanged (own submissions only)", () => {
  assert.equal(viewVerdict(student, "submissions/s1/f.pdf"), true);
  assert.equal(viewVerdict(student, "submissions/s2/f.pdf"), false);
  assert.equal(viewVerdict({ dbId: "d1", sub: "x" }, "submissions/d1/f.pdf"), true);
  assert.equal(viewVerdict(student, "avatars/s1.png"), false);
});
