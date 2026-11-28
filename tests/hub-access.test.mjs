import { test } from "node:test";
import assert from "node:assert/strict";
import { canStudentAccessHub } from "../lib/course-access.ts";

test("empty or null year_level is open to every student", () => {
  assert.equal(canStudentAccessHub([], { email: "6601001@smac.ac.th", studyYear: 1 }), true);
  assert.equal(canStudentAccessHub(null, { email: "6601001@smac.ac.th", studyYear: null }), true);
  assert.equal(canStudentAccessHub(undefined, { email: "6601001@smac.ac.th" }), true);
});

test("school student year match and mismatch", () => {
  assert.equal(canStudentAccessHub([1, 2], { email: "6601001@smac.ac.th", studyYear: 2 }), true);
  assert.equal(canStudentAccessHub([1, 2], { email: "6601001@smac.ac.th", studyYear: 3 }), false);
});

test("student with no study year is denied against a locked hub", () => {
  assert.equal(canStudentAccessHub([2], { email: "6601001@smac.ac.th", studyYear: null }), false);
  assert.equal(canStudentAccessHub([2], { email: "6601001@smac.ac.th" }), false);
});

test("external-domain student matches by domain grade year_no", () => {
  const grades = [
    { prefix: "69", year_label: "ปี 1", domain: "ext.invalid", year_no: 1 },
    { prefix: "68", year_label: "ปี 2", domain: "ext.invalid", year_no: 2 },
  ];
  assert.equal(
    canStudentAccessHub([1], { email: "690001@ext.invalid", tutorOnly: true }, grades),
    true
  );
  assert.equal(
    canStudentAccessHub([2], { email: "690001@ext.invalid", tutorOnly: true }, grades),
    false
  );
  assert.equal(
    canStudentAccessHub([1], { email: "670001@ext.invalid", tutorOnly: true }, grades),
    false
  );
});
