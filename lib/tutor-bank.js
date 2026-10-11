// Pure helpers for the tutor question bank page. Imports only pure modules: safe for client and node --test.
import { EXTERNAL_YEAR_BASE } from "./course-access.js";
import { hasRole } from "./roles.js";

// Topics are free text per lesson; DB uniqueness is on lower(btrim(name)), so match the same way.
export function normalizeTopic(name) {
  return String(name ?? "").trim();
}

export function findTopic(topics, name) {
  const key = normalizeTopic(name).toLowerCase();
  if (!key) return null;
  return topics.find((t) => normalizeTopic(t.name).toLowerCase() === key) || null;
}

// drawCount: lessons.tutor_draw_count (null = use the whole bank). Returns a warning text or null.
export function bankWarning(bankSize, drawCount) {
  if (bankSize === 0) return "คลังข้อสอบของบทนี้ยังว่าง กรุณาเพิ่มข้อสอบก่อนเปิดให้นักศึกษาใช้";
  if (drawCount != null && bankSize < drawCount) {
    return `คลังมี ${bankSize} ข้อ น้อยกว่าจำนวนที่ตั้งไว้ ${drawCount} ข้อต่อรอบ กรุณาเพิ่มข้อสอบก่อนเปิดให้นักศึกษาใช้`;
  }
  return null;
}

// "" -> null (whole bank); otherwise a positive integer, else undefined (invalid).
export function parseDrawCount(input) {
  const s = String(input ?? "").trim();
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n > 0 ? n : undefined;
}

// Who can open a tutor set? Mirrors canStudentAccessTutorSet (lib/course-access.js): fail closed. Without a year or a
// section lock only the listed emails get in, and with no lock at all NO student sees the set (unlike a course,
// where an empty year list means every year). course: { year_level, section, access: { allowedEmails } }.
// Returns { open, text }: open = at least one lock is set, text = one line for the instructor.
export function lockSummary(course) {
  const years = (course?.year_level || []).filter(Boolean);
  const section = course?.section && course.section !== "ไม่ระบุ Section" ? course.section : "";
  const emails = (course?.access?.allowedEmails || []).length;
  if (!years.length && !section && !emails) return { open: false, text: "ยังไม่ได้ล็อค ไม่มีนักศึกษาเห็นชุดนี้" };
  const parts = [];
  const school = years.filter((y) => Number(y) < EXTERNAL_YEAR_BASE).sort((a, b) => a - b);
  const external = years.length - school.length; // year levels of external domains lock by an opaque key: count them
  if (school.length) parts.push("ชั้นปี " + school.join(", "));
  if (external) parts.push(external + " ชั้นปีของโดเมนภายนอก");
  if (section) parts.push(section);
  if (emails) parts.push(emails + " อีเมลพิเศษ");
  return { open: true, text: parts.join(" · ") };
}

// ---- standalone bank page (/i/tutor/bank) ----

// Same visibility rule as /i/tutor and /i/courses: admin = all, course_manager = own subject group(s), instructor =
// assigned courses (mineIds = course_instructors.course_id of the caller). Everything else sees nothing.
// RLS is the real gate (is_instructor()); this narrows the rows to the sets the caller manages.
export function visibleTutorSets(courses, user, mineIds) {
  return (courses || []).filter((c) => {
    if (hasRole(user?.role, "admin")) return true;
    if (hasRole(user?.role, "course_manager")) return c.group_id === user.group_id || !!user.group_ids?.includes(c.group_id);
    if (hasRole(user?.role, "instructor")) return (mineIds || []).includes(c.id);
    return false;
  });
}

// rows: { id, setId, lessonId, topic (name or ""), text }. Empty filter value = no filter on that axis.
// topic matches by normalized name (topics are per lesson, the same wording in two lessons is one topic here).
export function filterBank(rows, { setId = "", lessonId = "", topic = "", q = "" } = {}) {
  const t = normalizeTopic(topic).toLowerCase();
  const needle = normalizeTopic(q).toLowerCase();
  return rows.filter((r) =>
    (!setId || r.setId === setId) &&
    (!lessonId || r.lessonId === lessonId) &&
    (!t || normalizeTopic(r.topic).toLowerCase() === t) &&
    (!needle || String(r.text ?? "").toLowerCase().includes(needle)));
}

// Distinct topic names (first spelling wins) among rows, sorted; used for the topic dropdown after the set/lesson filter.
export function topicNames(rows) {
  const seen = new Map();
  for (const r of rows) {
    const n = normalizeTopic(r.topic);
    if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "th"));
}
