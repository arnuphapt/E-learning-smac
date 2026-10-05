import { test } from "node:test";
import assert from "node:assert/strict";
import { canStudentAccessCourse, canStudentAccessTutorSet, sectionRangeMatch } from "../lib/course-access.js";

const grades = [{ prefix: "66", year_label: "ชั้นปีที่ 4" }];
const sections = [
  { name: "A", range_start: "001", range_end: "050" },
  { name: "B", range_start: null, range_end: null },
];
const stu = (over = {}) => ({ email: "66010030@smnc.ac.th", studentNo: "66010030", section: "A", studyYear: 4, ...over });
const course = (over = {}) => ({ section: null, year_level: [], access: { allowedEmails: [] }, ...over });
const can = (c, s = stu()) => canStudentAccessCourse(c, s, sections, grades);

test("no lock = open to every student (same as course pages today)", () => {
  assert.equal(can(course()), true);
  assert.equal(can(course({ year_level: null, access: null })), true);
});

test("year_level: numeric study year matches, other year is rejected", () => {
  assert.equal(can(course({ year_level: [4] })), true);
  assert.equal(can(course({ year_level: ["4"] })), true);
  assert.equal(can(course({ year_level: [3, 5] })), false);
  assert.equal(can(course({ year_level: [4] }), stu({ studyYear: null })), false);
});

test("year_level: label form matches through the student_grades prefix", () => {
  assert.equal(can(course({ year_level: ["ชั้นปีที่ 4"] })), true);
  assert.equal(can(course({ year_level: ["ชั้นปีที่ 3"] })), false);
  assert.equal(can(course({ year_level: ["ชั้นปีที่ 4"] }), stu({ email: "staffish@smnc.ac.th" })), false);
});

test("allowedEmails lets a student in regardless of year and section", () => {
  const c = course({ year_level: [1], section: "A", access: { allowedEmails: ["66010030@smnc.ac.th"] } });
  assert.equal(can(c, stu({ studyYear: 4, section: "Z", studentNo: "999" })), true);
});

test("section with a number range: inside passes, outside fails, even when year matches", () => {
  assert.equal(can(course({ section: "A" })), true);
  assert.equal(can(course({ section: "A" }), stu({ studentNo: "66010099", email: "66010099@smnc.ac.th" })), false);
});

test("section without a range falls back to comparing the student's section name", () => {
  assert.equal(can(course({ section: "B" }), stu({ section: "B" })), true);
  assert.equal(can(course({ section: "B" }), stu({ section: "A" })), false);
});

test("unknown section master row and the 'ไม่ระบุ Section' placeholder", () => {
  assert.equal(can(course({ section: "Nope" })), false);
  assert.equal(can(course({ section: "ไม่ระบุ Section" })), true);
});

test("student number comes from the email when the profile has none", () => {
  assert.equal(can(course({ section: "A" }), stu({ studentNo: "" })), true);
});

test("sectionRangeMatch edge cases", () => {
  assert.equal(sectionRangeMatch("12", "A", sections), false); // shorter than 3 digits
  assert.equal(sectionRangeMatch("66010030", "A", []), false);
  assert.equal(sectionRangeMatch("66010030", "B", sections), null);
});

const canTutor = (c, s = stu()) => canStudentAccessTutorSet(c, s, sections, grades);

test("tutor set: no lock = closed (course pages stay open)", () => {
  assert.equal(can(course()), true);
  assert.equal(canTutor(course()), false);
  assert.equal(canTutor(course({ year_level: null, access: null })), false);
  assert.equal(canTutor(course({ section: "ไม่ระบุ Section" })), false);
});

test("tutor set: email-only lock admits only the listed emails", () => {
  const c = course({ access: { allowedEmails: ["66010030@smnc.ac.th"] } });
  assert.equal(canTutor(c), true);
  assert.equal(canTutor(c, stu({ email: "66010031@smnc.ac.th" })), false);
});

test("tutor set: year / section locks behave like courses once a lock exists", () => {
  assert.equal(canTutor(course({ year_level: [4] })), true);
  assert.equal(canTutor(course({ year_level: [3] })), false);
  assert.equal(canTutor(course({ section: "A" })), true);
  assert.equal(canTutor(course({ section: "A" }), stu({ studentNo: "66010099", email: "66010099@smnc.ac.th" })), false);
});
