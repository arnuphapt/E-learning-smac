import type { Json } from "./database.types";

// Pure: may this STUDENT open a course? Same rules the student pages apply client-side today
// (app/s/courses/page.jsx, app/s/ai/page.jsx), extracted so server routes can enforce them.
// Staff are not decided here (callers let staff through). No imports: safe for server, client and node --test.
const NO_SECTION = "ไม่ระบุ Section";

// student_grades.domain default: the school's own domain. Rows (and clients) without a domain mean this one.
export const DEFAULT_DOMAIN = "smnc.ac.th";
// courses.year_level is integer[]. School years lock by their number (1, 2, ...). A year level of an external domain
// locks by student_grades.year_no, a key the database hands out (>= this base, unique across domains), so it can never
// equal a school year or another domain's level.
export const EXTERNAL_YEAR_BASE = 1000;
export const emailDomain = (email: string | null | undefined): string =>
  (String(email || "").split("@")[1] || "").toLowerCase();

export interface SectionRule {
  name?: string | null;
  range_start?: string | null;
  range_end?: string | null;
}

export interface GradeRule {
  prefix: string;
  year_label: string;
  domain?: string | null;
  year_no?: number | null;
}

export interface CourseAccessInput {
  kind?: string | null;
  section?: string | null;
  year_level?: readonly (number | string)[] | null;
  access?: { allowedEmails?: readonly string[] | null } | Json | null;
}

export interface StudentAccessInput {
  email?: string | null;
  studentNo?: string | null;
  section?: string | null;
  studyYear?: number | string | null;
  tutorOnly?: boolean;
}

export interface LessonAccessInput {
  status?: string | null;
}

function getAllowedEmails(access: CourseAccessInput["access"]): readonly string[] {
  if (!access || typeof access !== "object" || Array.isArray(access)) return [];
  const emails = (access as { allowedEmails?: unknown }).allowedEmails;
  return Array.isArray(emails) ? emails.filter((e): e is string => typeof e === "string") : [];
}

// true / false, or null when the section master has no number range (caller falls back to comparing section names).
export function sectionRangeMatch(
  studentNo: string | null | undefined,
  sectionName: string | null | undefined,
  sections: readonly SectionRule[] | null | undefined
): boolean | null {
  if (!sectionName || !sections || sections.length === 0) return false;
  const masterSec = sections.find((s) => s.name === sectionName);
  if (!masterSec) return false;
  const start = masterSec.range_start;
  const end = masterSec.range_end;
  if (!start || !end) return null;
  if (!studentNo) return false;
  const snoStr = String(studentNo).trim();
  if (snoStr.length < 3) return false;
  const last3 = parseInt(snoStr.slice(-3), 10);
  const startVal = parseInt(start, 10);
  const endVal = parseInt(end, 10);
  if (isNaN(last3) || isNaN(startVal) || isNaN(endVal)) return false;
  return last3 >= startVal && last3 <= endVal;
}

// Tutor sets fail CLOSED: a set with no lock at all (no year_level, no section, no allowedEmails) is visible to no
// student, and an allowedEmails-only lock admits only the listed emails. Course pages keep canStudentAccessCourse as is.
export function canStudentAccessTutorSet(
  course: CourseAccessInput,
  student: StudentAccessInput,
  sections?: readonly SectionRule[] | null,
  grades?: readonly GradeRule[] | null
): boolean {
  if (getAllowedEmails(course.access).includes(student.email || "")) return true;
  const hasSection = !!course.section && course.section !== NO_SECTION;
  const hasYear = (course.year_level || []).length > 0;
  if (!hasSection && !hasYear) return false;
  return canStudentAccessCourse(course, student, sections, grades);
}

// May this STUDENT open the files of a lesson? The lesson must exist and be published ("active", same as lessons_select),
// and its course must be open to the student: a tutor set by the fail-closed tutor rule, a normal course by the course rule.
// lesson: { status } | null, course: { kind, section, year_level, access } | null
export function canStudentOpenLesson(
  lesson: LessonAccessInput | null | undefined,
  course: CourseAccessInput | null | undefined,
  student: StudentAccessInput,
  sections?: readonly SectionRule[] | null,
  grades?: readonly GradeRule[] | null
): boolean {
  if (!lesson || lesson.status !== "active" || !course) return false;
  return course.kind === "tutor"
    ? canStudentAccessTutorSet(course, student, sections, grades)
    : canStudentAccessCourse(course, student, sections, grades);
}

// course: { section, year_level, access: { allowedEmails } }
// student: { email, studentNo, section, studyYear, tutorOnly }  (studentNo falls back to the digits before "@" in the email)
// grades: student_grades rows { prefix, year_label, domain, year_no }; sections: sections rows
// Year levels are per domain: a school student uses the DEFAULT_DOMAIN rows, an external tutor-only student the rows of
// the domain in their email. An external student has no school study year and no section: only the year_no of THEIR
// domain's row for the prefix in their email (or an allowed email) can open a set for them.
export function canStudentAccessCourse(
  course: CourseAccessInput,
  student: StudentAccessInput,
  sections?: readonly SectionRule[] | null,
  grades?: readonly GradeRule[] | null
): boolean {
  const email = student.email || "";
  const allowedEmails = getAllowedEmails(course.access);
  if (allowedEmails.includes(email)) return true;

  const match = email.match(/^(\d+)@/);
  const studentNo = student.studentNo || (match ? match[1] : "");

  const tutorOnly = !!student.tutorOnly;
  if (course.section && course.section !== NO_SECTION) {
    if (tutorOnly) return false; // sections belong to the school: an external student is never in one
    const rangeMatch = sectionRangeMatch(studentNo, course.section, sections);
    if (rangeMatch === null) {
      if ((student.section || "") !== course.section) return false;
    } else if (!rangeMatch) {
      return false;
    }
  }

  const allowed = course.year_level;
  if (!allowed || allowed.length === 0) return true; // no restriction

  const prefix = match ? match[1].substring(0, 2) : "";
  const domain = tutorOnly ? emailDomain(email) : DEFAULT_DOMAIN;
  const domainGrades = (grades || []).filter((g) => (g.domain || DEFAULT_DOMAIN) === domain);
  const exact = prefix ? domainGrades.find((g) => g.prefix === prefix) : undefined;
  const mapping = exact || (tutorOnly ? domainGrades.find((g) => g.prefix === "") : undefined);
  const studentLabel = !tutorOnly && mapping ? mapping.year_label : null;
  const studyYear = tutorOnly ? (mapping?.year_no ?? null) : student.studyYear ? Number(student.studyYear) : null;

  return allowed.some((ay) => {
    if (typeof ay === "number" || !isNaN(Number(ay))) return Number(ay) === studyYear;
    return ay === studentLabel;
  });
}
