// External-domain (tutor-only) users: registration role, per-domain year derivation, lock matching across domains.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canStudentAccessTutorSet, canStudentAccessCourse, emailDomain } from "../lib/course-access.js";
import { registrationPlan } from "../lib/registration.js";
import { isTutorOnlyRole, isStaffRole } from "../lib/roles.js";
import { viewVerdict, canUpload } from "../lib/r2.js";
import { lockSummary } from "../lib/tutor-bank.js";

// two external domains share the prefix "69" and even the label "ปี 1"; their levels differ by year_no (DB-assigned, >= 1000)
const grades = [
  { prefix: "69", year_label: "ชั้นปีที่ 1", domain: "smnc.ac.th" },
  { prefix: "66", year_label: "ชั้นปีที่ 4", domain: "smnc.ac.th" },
  { prefix: "70", year_label: "ปี 1", year_no: 1009 /* no domain: a pre-migration row = smnc.ac.th, its year_no is ignored */ },
  { prefix: "69", year_label: "ปี 1", domain: "a.example", year_no: 1001 },
  { prefix: "68", year_label: "ปี 2", domain: "a.example", year_no: 1002 },
  { prefix: "69", year_label: "ปี 1", domain: "b.example", year_no: 1003 },
  { prefix: "", year_label: "ทั้งวิทยาลัย", domain: "c.example", year_no: 1004 },
  { prefix: "69", year_label: "ปี 1", domain: "c.example", year_no: 1005 },
];
const guest = (email, over = {}) => ({ email, tutorOnly: true, studyYear: 1, section: "A", studentNo: "", ...over });
const set = (over = {}) => ({ section: null, year_level: [], access: { allowedEmails: [] }, ...over });
const can = (c, s) => canStudentAccessTutorSet(c, s, [{ name: "A", range_start: "001", range_end: "999" }], grades);

test("registration: smnc.ac.th is a student (with a year for digits), NEVER an instructor", () => {
  assert.deepEqual(registrationPlan("69010001@smnc.ac.th"), { role: "student", studentNo: "69010001", studyYear: 1 });
  assert.deepEqual(registrationPlan("65010001@smnc.ac.th"), { role: "student", studentNo: "65010001", studyYear: 5 });
  assert.deepEqual(registrationPlan("64010001@smnc.ac.th"), { role: "student", studentNo: "64010001", studyYear: null });
  assert.deepEqual(registrationPlan("somebody@smnc.ac.th"), { role: "student", studentNo: null, studyYear: null }); // was "instructor"
  assert.equal(registrationPlan("Somebody@SMNC.AC.TH").role, "student");
});

test("registration: any other domain is tutor-only, NEVER staff, whatever the email looks like", () => {
  assert.deepEqual(registrationPlan("69010001@a.example"), { role: "tutor_guest", studentNo: "69010001", studyYear: null });
  assert.deepEqual(registrationPlan("somebody@a.example"), { role: "tutor_guest", studentNo: null, studyYear: null });
  assert.equal(registrationPlan("admin@A.EXAMPLE").role, "tutor_guest");
  assert.equal(registrationPlan("somebody@smnc.ac.th.evil.example").role, "tutor_guest");
  assert.equal(registrationPlan("somebody@evilsmnc.ac.th").role, "tutor_guest");
  assert.equal(registrationPlan("noatsign").role, "tutor_guest");
});

test("roles: tutor_guest is tutor-only and never staff", () => {
  assert.equal(isTutorOnlyRole("tutor_guest"), true);
  assert.equal(isStaffRole("tutor_guest"), false);
  assert.equal(isTutorOnlyRole("student"), false);
  assert.equal(isTutorOnlyRole("tutor_guest,instructor"), false); // staff wins: it is not a guest
  assert.equal(isTutorOnlyRole(undefined), false);
});

test("year derivation is per domain: the same prefix means the year level of the student's OWN domain", () => {
  assert.equal(can(set({ year_level: [1001] }), guest("69010001@a.example")), true);
  assert.equal(can(set({ year_level: [1003] }), guest("69010001@a.example")), false); // b.example's level, same label and prefix
  assert.equal(can(set({ year_level: [1003] }), guest("69010001@b.example")), true);
  assert.equal(can(set({ year_level: [1001] }), guest("69010001@b.example")), false);
  assert.equal(can(set({ year_level: [1002] }), guest("68010001@a.example")), true);
  assert.equal(can(set({ year_level: [1001] }), guest("68010001@a.example")), false); // 68 is level 2 in a.example
  assert.equal(can(set({ year_level: [1001, 1002] }), guest("68010001@a.example")), true);
  assert.equal(can(set({ year_level: ["1002"] }), guest("68010001@a.example")), true); // jsonb / text forms still numeric
});

test("a guest never matches a school year (number or label), nor a section", () => {
  assert.equal(can(set({ year_level: [1] }), guest("69010001@a.example")), false); // the study year passed in is ignored
  assert.equal(can(set({ year_level: ["1"] }), guest("69010001@a.example")), false);
  assert.equal(can(set({ year_level: ["ชั้นปีที่ 1"] }), guest("69010001@a.example")), false); // smnc label
  assert.equal(can(set({ year_level: ["ปี 1"] }), guest("69010001@a.example")), false); // labels never lock a guest
  assert.equal(can(set({ year_level: [4] }), guest("66010001@a.example")), false);
  assert.equal(can(set({ year_level: [1001] }), guest("66010001@a.example")), false); // 66 has no a.example row
  assert.equal(can(set({ section: "A", year_level: [1001] }), guest("69010001@a.example")), false);
  assert.equal(can(set({ section: "A" }), guest("69010001@a.example")), false);
});

test("a guest with a non-numeric email has no year: sees nothing, unless listed by email", () => {
  assert.equal(can(set({ year_level: [1001] }), guest("somebody@a.example")), false);
  assert.equal(can(set({ year_level: [1001], access: { allowedEmails: ["somebody@a.example"] } }), guest("somebody@a.example")), true);
});

test("external domain-wide year level (empty prefix): non-numeric email gets domain-wide row", () => {
  assert.equal(can(set({ year_level: [1004] }), guest("Thanpisit.yo@c.example")), true);
  assert.equal(can(set({ year_level: [1005] }), guest("Thanpisit.yo@c.example")), false);
});

test("external domain precedence: numeric email matches exact prefix over domain-wide row", () => {
  assert.equal(can(set({ year_level: [1005] }), guest("69010001@c.example")), true);
  assert.equal(can(set({ year_level: [1004] }), guest("69010001@c.example")), false);
});

test("external domain fallback: numeric email without matching prefix falls back to domain-wide row", () => {
  assert.equal(can(set({ year_level: [1004] }), guest("68010001@c.example")), true);
  assert.equal(can(set({ year_level: [1005] }), guest("68010001@c.example")), false);
});

test("school user is unaffected by smnc.ac.th empty prefix row", () => {
  const schoolGradesWithEmpty = [
    ...grades,
    { prefix: "", year_label: "ทั้งโรงเรียน", domain: "smnc.ac.th", year_no: 1099 },
  ];
  const stu = { email: "69010001@smnc.ac.th", studentNo: "69010001", section: "A", studyYear: 1 };
  const stuNonNumeric = { email: "somebody@smnc.ac.th", studentNo: null, section: "A", studyYear: null };
  assert.equal(canStudentAccessCourse(set({ year_level: ["ทั้งโรงเรียน"] }), stuNonNumeric, [], schoolGradesWithEmpty), false);
  assert.equal(canStudentAccessCourse(set({ year_level: [1099] }), stuNonNumeric, [], schoolGradesWithEmpty), false);
  assert.equal(canStudentAccessCourse(set({ year_level: ["ชั้นปีที่ 1"] }), stu, [], schoolGradesWithEmpty), true);
});

test("domain isolation: domain A empty prefix row does not apply to domain B", () => {
  assert.equal(can(set({ year_level: [1004] }), guest("somebody@b.example")), false);
  assert.equal(can(set({ year_level: [1004] }), guest("68010001@b.example")), false);
});

test("tutor sets still fail closed for a guest: no lock = nobody", () => {
  assert.equal(can(set(), guest("69010001@a.example")), false);
});

test("the domain is read from the email, case-insensitively, and the student_no on the profile is not trusted", () => {
  assert.equal(emailDomain("69010001@A.Example"), "a.example");
  assert.equal(can(set({ year_level: [1001] }), guest("69010001@A.Example")), true);
  // a guest edited their profile student_no to 68...: the year still comes from the email prefix
  assert.equal(can(set({ year_level: [1002] }), guest("69010001@a.example", { studentNo: "68010001" })), false);
});

test("school students are unchanged and ignore other domains' rows (even with the same prefix)", () => {
  const stu = { email: "69010001@smnc.ac.th", studentNo: "69010001", section: "A", studyYear: 1 };
  assert.equal(canStudentAccessCourse(set({ year_level: ["ชั้นปีที่ 1"] }), stu, [], grades), true);
  assert.equal(canStudentAccessCourse(set({ year_level: [1] }), stu, [], grades), true);
  assert.equal(canStudentAccessCourse(set({ year_level: [1001] }), stu, [], grades), false);
  assert.equal(canStudentAccessCourse(set({ year_level: [1009] }), stu, [], grades), false); // an external key is nobody's school year
  // rows from before the migration have no domain field: they count as smnc.ac.th
  assert.equal(canStudentAccessCourse(set({ year_level: ["ชั้นปีที่ 4"] }), { ...stu, email: "66010001@smnc.ac.th" }, [], [{ prefix: "66", year_label: "ชั้นปีที่ 4" }]), true);
});

test("files: a tutor-only user has no submissions to view or upload", () => {
  const g = { role: "tutor_guest", dbId: "u_1" };
  assert.equal(viewVerdict(g, "submissions/u_1/a.pdf"), false);
  assert.equal(canUpload(g, "submissions/u_1/a.pdf"), false);
  assert.deepEqual(viewVerdict(g, "lessons/l1/video/a.mp4"), { lessonId: "l1" }); // the lesson/course check (tutor kind only) is in canViewKey
  assert.equal(viewVerdict({ role: "student", dbId: "u_1" }, "submissions/u_1/a.pdf"), true);
});

test("lock summary lists school years and counts external levels", () => {
  assert.equal(lockSummary({ year_level: [3, 2, 1001, 1002], access: {} }).text, "ชั้นปี 2, 3 · 2 ชั้นปีของโดเมนภายนอก");
  assert.equal(lockSummary({ year_level: [1001], access: {} }).text, "1 ชั้นปีของโดเมนภายนอก");
});
