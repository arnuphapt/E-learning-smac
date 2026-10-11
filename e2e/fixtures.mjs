// Fixture seeding, auth minting and cleanup for the tutor-mode E2E suite.
// The ONLY database is production (Supabase qsvwabaxqtbrxrwrqtih), so every write here is limited to rows whose id
// starts with FX_PREFIX, plus rows the app itself creates for the fixture users (found through those users / courses).
// Real data is only ever read (roles table for the instructor's permission claim).
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as nextAuthJwt from "next-auth/jwt";

dotenv.config({ path: path.resolve(".env.local"), quiet: true });

export const FX_PREFIX = "fx_e2e_";
// Codes typed by the instructor spec through the UI (the UI generates its own ids, so those rows are found by this code
// and by the fixture instructor's course_instructors link).
export const UI_CODE_PREFIX = "FXE2E-";
export const AUTH_DIR = path.resolve("e2e/.auth"); // gitignored: holds minted session cookies
export const STATE = {
  student: path.join(AUTH_DIR, "student.json"),
  instructor: path.join(AUTH_DIR, "instructor.json"),
  guest: path.join(AUTH_DIR, "guest.json"),
};

export const FX = {
  student: { id: "fx_e2e_student", name: "E2E Student", email: "fx_e2e_student@e2e.invalid" },
  instructor: { id: "fx_e2e_instructor", name: "E2E Instructor", email: "fx_e2e_instructor@e2e.invalid" },
  // External-domain (tutor-only) user. Domain and year levels exist only for the external-domain spec (seedExternal).
  guest: { id: "fx_e2e_guest", name: "E2E Guest", email: "69999991@fx-e2e-ext.invalid", studentNo: "69999991" },
  course: { id: "fx_e2e_course", code: "FXE2E-FIXTURE", title: "[E2E] ชุดติว fixture" },
  lesson: { id: "fx_e2e_lesson", title: "[E2E] บทที่ 1" },
  topics: [
    { id: "fx_e2e_topic_a", name: "E2E หัวใจ" },
    { id: "fx_e2e_topic_b", name: "E2E ไต" },
  ],
};
export const EXT = {
  domain: "fx-e2e-ext.invalid",
  // year levels of the external domain; their lock key (year_no) is assigned by the database
  grades: [
    { id: "fx_e2e_sg_y1", prefix: "69", year_label: "E2E ปี 1" },
    { id: "fx_e2e_sg_y2", prefix: "68", year_label: "E2E ปี 2" },
  ],
  // three tutor sets, all with one active lesson: only `own` is locked to the guest's year level
  // (own / otherYear get year_level from the year_no of `grade` once the year levels exist)
  own: { id: "fx_e2e_set_ext1", code: "FXE2E-EXT1", title: "[E2E] ชุดติวของปี 1 โดเมนภายนอก", grade: "fx_e2e_sg_y1" },
  otherYear: { id: "fx_e2e_set_ext2", code: "FXE2E-EXT2", title: "[E2E] ชุดติวของปี 2 โดเมนภายนอก", grade: "fx_e2e_sg_y2" },
  school: { id: "fx_e2e_set_school", code: "FXE2E-SCH", title: "[E2E] ชุดติวของนักศึกษาปี 1 ของโรงเรียน", year_level: [1] },
};
// n = 1..4; questions 1-2 are topic A, 3-4 topic B. Every right answer is choice "a" ("E2E-n ถูก"), the wrong one "b".
export const questionText = (n) => `E2E-${n} โจทย์ทดสอบ`;
export const choiceText = (n, right) => `E2E-${n} ${right ? "ถูก" : "ผิด"}`;
export const explanationText = (n) => `E2E-${n} คำอธิบายของอาจารย์`;

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("e2e: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const must = ({ error }, what) => {
  if (error) throw new Error(`e2e: ${what}: ${error.message}`);
};

// ---- auth: NextAuth session cookie minted from NEXTAUTH_SECRET, same claim shape as the jwt callback ----
const encode = nextAuthJwt.encode ?? nextAuthJwt.default.encode;
const COOKIE = "next-auth.session-token"; // http (non-secure) cookie name, the suite runs on http://127.0.0.1

async function writeState(file, user, role, permissions, origin) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("e2e: NEXTAUTH_SECRET missing from .env.local");
  const maxAge = 60 * 60 * 6;
  const value = await encode({
    secret,
    maxAge,
    token: {
      name: user.name,
      email: user.email,
      sub: user.id,
      role,
      dbId: user.id,
      study_year: null,
      group_id: null,
      group_ids: [],
      permissions,
      originalAdminId: null,
    },
  });
  const state = {
    cookies: [
      {
        name: COOKIE,
        value,
        domain: new URL(origin).hostname,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + maxAge,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [],
  };
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
}

export async function mintSessions(db, origin) {
  const { data, error } = await db.from("roles").select("permissions").eq("id", "admin").single(); // read-only
  if (error) throw new Error("e2e: cannot read roles: " + error.message);
  await writeState(STATE.student, FX.student, "student", [], origin);
  await writeState(STATE.instructor, FX.instructor, "admin", data.permissions || [], origin);
  await writeState(STATE.guest, FX.guest, "tutor_guest", [], origin);
}

// GET a PostgREST path (e.g. "courses?select=id") as the signed-in user of `page`: the same short-lived Supabase JWT the
// browser client gets from /api/supabase-token, so RLS and view rules apply exactly as they do in the app.
export async function restAs(page, restPath) {
  const tokenRes = await page.request.get("/api/supabase-token");
  if (!tokenRes.ok()) throw new Error(`e2e: /api/supabase-token ${tokenRes.status()}`);
  const { token } = await tokenRes.json();
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${restPath}`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: await res.json() };
}

// ---- seed ----
export async function seedFixtures(db) {
  must(
    await db.from("users").upsert([
      { id: FX.student.id, name: FX.student.name, email: FX.student.email, role: "student" },
      { id: FX.instructor.id, name: FX.instructor.name, email: FX.instructor.email, role: "admin" },
    ]),
    "seed users",
  );
  // Locked to the fixture student by email only (tutor sets fail closed: no year / section lock, so no real student qualifies).
  must(
    await db.from("courses_all").upsert({
      id: FX.course.id,
      code: FX.course.code,
      title: FX.course.title,
      subtitle: "E2E fixture, safe to delete",
      term: "E2E",
      year: "2999",
      instructor: FX.instructor.name,
      hero: "#0d6e8c",
      access: { allowedYears: [], allowedEmails: [FX.student.email] },
      year_level: [],
      section: null,
      kind: "tutor",
    }),
    "seed course",
  );
  must(
    await db.from("lessons").upsert({
      id: FX.lesson.id,
      course_id: FX.course.id,
      index: 1,
      title: FX.lesson.title,
      description: "E2E fixture lesson",
      status: "active",
      tutor_draw_count: null, // whole bank: 4 questions, 4 minutes
    }),
    "seed lesson",
  );
  must(await db.from("tutor_topics").upsert(FX.topics.map((t) => ({ ...t, lesson_id: FX.lesson.id }))), "seed topics");
  must(
    await db.from("questions").upsert(
      [1, 2, 3, 4].map((n) => ({
        id: `fx_e2e_q${n}`,
        no: n,
        type: "single",
        text: questionText(n),
        choices: [
          { id: "a", text: choiceText(n, true) },
          { id: "b", text: choiceText(n, false) },
        ],
        answer: "a",
        explanation: explanationText(n),
        lesson_id: FX.lesson.id,
        kind: "tutor",
        topic_id: n <= 2 ? FX.topics[0].id : FX.topics[1].id,
      })),
    ),
    "seed questions",
  );
}

// External-domain fixtures. The guest user and the tutor sets need nothing new in the database; the domain and its year
// levels need the migration 20261011040000_tutor_external_domains.sql (student_grades.domain). Returns false (and seeds only
// the part that works) while it is not applied, so the spec can skip the year-lock tests.
export async function externalMigrationApplied(db) {
  const { error } = await db.from("student_grades").select("domain").limit(1);
  return !error;
}

export async function seedExternal(db) {
  must(
    await db.from("users").upsert({ id: FX.guest.id, name: FX.guest.name, email: FX.guest.email, role: "tutor_guest", student_no: FX.guest.studentNo }),
    "seed guest user",
  );
  for (const set of [EXT.own, EXT.otherYear, EXT.school]) {
    must(
      await db.from("courses_all").upsert({
        id: set.id, code: set.code, title: set.title, subtitle: "E2E fixture, safe to delete", term: "E2E", year: "2999",
        instructor: FX.instructor.name, hero: "#0d6e8c", access: { allowedYears: [], allowedEmails: [] },
        year_level: set.year_level || [], section: null, kind: "tutor", // the external sets are locked below, once their year levels exist
      }),
      "seed external set " + set.id,
    );
    must(
      await db.from("lessons").upsert({ id: set.id + "_lesson", course_id: set.id, index: 1, title: "[E2E] บทของ " + set.code, description: "E2E fixture lesson", status: "active", tutor_draw_count: null }),
      "seed external lesson " + set.id,
    );
  }
  if (!(await externalMigrationApplied(db))) return false;
  must(await db.from("allowed_domains").upsert({ domain: EXT.domain }), "seed external domain");
  must(await db.from("student_grades").upsert(EXT.grades.map((g) => ({ ...g, domain: EXT.domain }))), "seed external year levels");
  for (const set of [EXT.own, EXT.otherYear]) {
    const { data, error } = await db.from("student_grades").select("year_no").eq("id", set.grade).single();
    if (error || !data?.year_no) throw new Error("e2e: year level without year_no (trigger missing?): " + (error?.message || set.grade));
    must(await db.from("courses_all").update({ year_level: [data.year_no] }).eq("id", set.id), "lock external set " + set.id);
  }
  return true;
}

// ---- cleanup ----
const ids = (rows, col) => [...new Set((rows || []).map((r) => r[col]).filter(Boolean))];
async function del(db, table, col, values) {
  if (!values.length) return;
  must(await db.from(table).delete().in(col, values), `delete ${table}`);
}

// Deletes every row created by the fixture (seed) or by the fixture users through the app. Idempotent.
export async function cleanFixtures(db) {
  const userIds = [FX.student.id, FX.instructor.id, FX.guest.id];
  const [links, byCode, byId] = await Promise.all([
    db.from("course_instructors").select("course_id").in("user_id", userIds),
    db.from("courses_all").select("id").like("code", `${UI_CODE_PREFIX}%`),
    db.from("courses_all").select("id").like("id", `${FX_PREFIX}%`),
  ]);
  for (const r of [links, byCode, byId]) must(r, "find fixture courses");
  const courseIds = [...new Set([...ids(links.data, "course_id"), ...ids(byCode.data, "id"), ...ids(byId.data, "id")])];

  const [lByCourse, lById] = await Promise.all([
    courseIds.length ? db.from("lessons").select("id").in("course_id", courseIds) : { data: [] },
    db.from("lessons").select("id").like("id", `${FX_PREFIX}%`),
  ]);
  must(lByCourse, "find fixture lessons");
  must(lById, "find fixture lessons");
  const lessonIds = [...new Set([...ids(lByCourse.data, "id"), ...ids(lById.data, "id")])];

  await del(db, "tutor_attempts", "student_id", userIds); // tutor_answers go with them (ON DELETE CASCADE)
  await del(db, "tutor_attempts", "lesson_id", lessonIds);
  await del(db, "ai_chat_logs", "student_id", userIds);
  await del(db, "ai_chat_logs", "course_id", courseIds);
  await del(db, "ai_chat_logs", "lesson_id", lessonIds);
  await del(db, "questions", "lesson_id", lessonIds);
  await del(db, "tutor_topics", "lesson_id", lessonIds);
  await del(db, "lessons", "id", lessonIds);
  await del(db, "course_instructors", "user_id", userIds);
  await del(db, "course_instructors", "course_id", courseIds);
  await del(db, "courses_all", "id", courseIds);
  await del(db, "users", "id", userIds);
  must(await db.from("student_grades").delete().like("id", `${FX_PREFIX}%`), "delete fixture year levels"); // before the domain (FK)
  must(await db.from("allowed_domains").delete().like("domain", "fx-e2e-%"), "delete fixture domains");
  must(await db.from("users").delete().like("id", `${FX_PREFIX}%`), "delete fixture users by prefix"); // extra students seeded by a spec
}

// Throws when anything fixture-like is still in the database. Counts only; never reads other people's rows.
export async function assertNoFixtures(db) {
  const checks = [
    ["users", "id", FX_PREFIX],
    ["courses_all", "id", FX_PREFIX],
    ["courses_all", "code", UI_CODE_PREFIX],
    ["lessons", "id", FX_PREFIX],
    ["questions", "id", FX_PREFIX],
    ["tutor_topics", "id", FX_PREFIX],
    ["tutor_attempts", "student_id", FX_PREFIX],
    ["ai_chat_logs", "student_id", FX_PREFIX],
    ["course_instructors", "user_id", FX_PREFIX],
    ["student_grades", "id", FX_PREFIX],
    ["allowed_domains", "domain", "fx-e2e-"],
  ];
  const left = [];
  for (const [table, col, prefix] of checks) {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).like(col, `${prefix}%`);
    if (error) throw new Error(`e2e: verify ${table}: ${error.message}`);
    if (count) left.push(`${table}.${col} like '${prefix}%': ${count}`);
  }
  if (left.length) throw new Error("e2e: fixture rows remain after teardown:\n" + left.join("\n"));
}
