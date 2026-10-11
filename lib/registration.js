// Pure: what a first-time Google sign-in from an ALLOWED domain becomes (no imports: safe for node --test).
// The school domain registers students only; every other allowed domain is external and tutor-only. Never staff.
import { DEFAULT_DOMAIN } from "./course-access.js";
import { TUTOR_ONLY_ROLE } from "./roles.js";

// smnc.ac.th student-number prefix -> study year (the old hard-coded table; other domains use student_grades).
const SMNC_YEARS = { 69: 1, 68: 2, 67: 3, 66: 4, 65: 5 };

// -> { role, studentNo, studyYear }
export function registrationPlan(email) {
  const [, rawDomain = ""] = String(email || "").split("@");
  const match = String(email || "").match(/^(\d+)@/);
  const studentNo = match ? match[1] : null;
  if (rawDomain.toLowerCase() !== DEFAULT_DOMAIN) {
    // External: NEVER instructor/staff, whatever the email looks like. The year is derived later, per domain, from
    // student_grades (course-access.js); study_year stays null so no school year number can ever match.
    return { role: TUTOR_ONLY_ROLE, studentNo, studyYear: null };
  }
  // smnc.ac.th: an all-digit email is a student with a year. ANY OTHER email is also a student, without student_no / year:
  // auto-registration never creates staff (it used to make every non-digit @smnc.ac.th address an instructor).
  // Staff are created or promoted by an admin; existing users are untouched.
  return { role: "student", studentNo, studyYear: studentNo ? SMNC_YEARS[studentNo.substring(0, 2)] ?? null : null };
}
