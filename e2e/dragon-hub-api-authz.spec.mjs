// API authorization / validation matrix for the dragon hub phase 2 endpoints (no login, wrong role, wrong owner, bad input).
// Rows created here are tagged `test_tester_` and removed in afterAll; the fixture users come from global-setup.
import { test, expect, request as pwRequest } from "@playwright/test";
import { randomUUID } from "node:crypto";
import * as nextAuthJwt from "next-auth/jwt";
import { adminDb, FX, STATE } from "./fixtures.mjs";

const TAG = "test_tester_";
const INST2 = { id: `${TAG}api_inst2`, name: `${TAG}api_inst2`, email: `${TAG}api_inst2@e2e.invalid` };
const encode = nextAuthJwt.encode ?? nextAuthJwt.default.encode;

function must({ error }, what) {
  if (error) throw new Error(`e2e dragon-hub-api-authz: ${what}: ${error.message}`);
}

test.describe("dragon hub API authorization", () => {
  const hubId = randomUUID();
  const foreignDragonId = randomUUID();
  const inst2QuizId = randomUUID();
  const instructorQuizId = randomUUID();
  let baseURL;
  let anon;
  let student;
  let instructor;
  let inst2;

  test.beforeAll(async ({}, testInfo) => {
    baseURL = testInfo.project.use.baseURL;
    const db = adminDb();
    must(await db.from("users").upsert({ ...INST2, role: "admin" }), "seed second instructor");
    must(
      await db.from("live_hubs").insert({ id: hubId, host_id: FX.instructor.id, name: `${TAG}api hub`, year_level: [1] }),
      "seed hub"
    );
    must(
      await db.from("dragons").insert({ id: foreignDragonId, user_id: FX.studentYear2.id, species_id: "001", points: 0, is_partner: false }),
      "seed foreign dragon"
    );
    must(
      await db.from("live_quizzes").insert([
        { id: inst2QuizId, owner_id: INST2.id, title: `${TAG}inst2 quiz` },
        { id: instructorQuizId, owner_id: FX.instructor.id, title: `${TAG}inst1 quiz` },
      ]),
      "seed quizzes"
    );
    must(
      await db.from("live_quiz_questions").insert([
        { quiz_id: inst2QuizId, no: 1, text: "Q1", choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: "a", time_limit_sec: 20 },
        { quiz_id: instructorQuizId, no: 1, text: "Q1", choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: "a", time_limit_sec: 20 },
      ]),
      "seed quiz questions"
    );

    const token = await encode({
      secret: process.env.NEXTAUTH_SECRET,
      maxAge: 3600,
      token: {
        name: INST2.name,
        email: INST2.email,
        sub: INST2.id,
        role: "admin",
        dbId: INST2.id,
        study_year: null,
        group_id: null,
        group_ids: [],
        permissions: [],
        originalAdminId: null,
      },
    });
    anon = await pwRequest.newContext({ baseURL });
    student = await pwRequest.newContext({ baseURL, storageState: STATE.student });
    instructor = await pwRequest.newContext({ baseURL, storageState: STATE.instructor });
    inst2 = await pwRequest.newContext({ baseURL, extraHTTPHeaders: { cookie: `next-auth.session-token=${token}` } });
  });

  test.afterAll(async () => {
    try {
      await Promise.all([anon, student, instructor, inst2].map((c) => c?.dispose()));
    } finally {
      const db = adminDb();
      must(await db.from("live_quizzes").delete().in("id", [inst2QuizId, instructorQuizId]), "delete quizzes");
      must(await db.from("dragons").delete().eq("id", foreignDragonId), "delete foreign dragon");
      must(await db.from("live_hubs").delete().eq("id", hubId), "delete hub");
      must(await db.from("users").delete().eq("id", INST2.id), "delete second instructor");
    }
  });

  test("no login: every hub / dragon endpoint answers 401", async () => {
    const calls = [
      ["GET", "/api/live/hubs"],
      ["POST", "/api/live/hubs"],
      ["GET", `/api/live/hubs/${hubId}`],
      ["PATCH", `/api/live/hubs/${hubId}`],
      ["GET", `/api/live/hubs/${hubId}/dragons`],
      ["GET", "/api/live/hubs/mine"],
      ["GET", "/api/dragon/me"],
      ["POST", "/api/dragon/partner"],
      ["POST", "/api/dragon/egg"],
    ];
    for (const [method, url] of calls) {
      const res = await anon.fetch(url, { method, data: {} });
      expect(res.status(), `${method} ${url}`).toBe(401);
    }
  });

  test("student cannot list, create, read or edit hubs", async () => {
    expect((await student.get("/api/live/hubs")).status()).toBe(403);
    expect((await student.post("/api/live/hubs", { data: { name: `${TAG}x`, year_level: [1] } })).status()).toBe(403);
    expect((await student.get(`/api/live/hubs/${hubId}`)).status()).toBe(403);
    expect((await student.patch(`/api/live/hubs/${hubId}`, { data: { name: `${TAG}hijack` } })).status()).toBe(403);
  });

  test("another instructor cannot read, edit, list or open a room under the owner's hub", async () => {
    expect((await inst2.get(`/api/live/hubs/${hubId}`)).status()).toBe(403);
    expect((await inst2.patch(`/api/live/hubs/${hubId}`, { data: { name: `${TAG}hijack` } })).status()).toBe(403);

    const list = await inst2.get("/api/live/hubs");
    expect(list.status()).toBe(200);
    expect((await list.json()).some((h) => h.id === hubId)).toBe(false);

    const room = await inst2.post("/api/live", { data: { hub_id: hubId, quiz_id: inst2QuizId, course_id: FX.course.id } });
    expect(room.status()).toBe(403);

    const db = adminDb();
    const { data } = await db.from("live_hubs").select("name").eq("id", hubId).single();
    expect(data.name).toBe(`${TAG}api hub`);
  });

  test("owner: validation errors, hub required for a room, own list", async () => {
    const noHub = await instructor.post("/api/live", { data: { quiz_id: instructorQuizId, course_id: FX.course.id } });
    expect(noHub.status()).toBe(400);
    expect((await noHub.json()).error).toMatch(/hub/);

    expect((await instructor.post("/api/live", { data: { hub_id: "not-a-uuid", quiz_id: instructorQuizId, course_id: FX.course.id } })).status()).toBe(400);
    expect((await instructor.post("/api/live/hubs", { data: { name: "   ", year_level: [1] } })).status()).toBe(400);
    expect((await instructor.post("/api/live/hubs", { data: { name: `${TAG}y`, year_level: "1" } })).status()).toBe(400);
    expect((await instructor.post("/api/live/hubs", { data: { name: `${TAG}y`, year_level: [0] } })).status()).toBe(400);
    expect((await instructor.patch(`/api/live/hubs/${hubId}`, { data: { year_level: [1.5] } })).status()).toBe(400);

    const list = await instructor.get("/api/live/hubs");
    expect(list.status()).toBe(200);
    const row = (await list.json()).find((h) => h.id === hubId);
    expect(row).toMatchObject({ id: hubId, host_id: FX.instructor.id, year_level: [1], room_count: 0, member_count: 0 });
  });

  test("hub scene API: owner 200 without personal fields, non-member student 403", async () => {
    const own = await instructor.get(`/api/live/hubs/${hubId}/dragons`);
    expect(own.status()).toBe(200);
    const body = await own.json();
    expect(Object.keys(body).sort()).toEqual(["dragons", "hub", "total_members"]);
    expect(body.dragons).toEqual([]);
    expect(Object.keys(body.hub).sort()).toEqual(["id", "name", "year_level"]);

    expect((await student.get(`/api/live/hubs/${hubId}/dragons`)).status()).toBe(403);
    expect((await inst2.get(`/api/live/hubs/${hubId}/dragons`)).status()).toBe(403);
  });

  test("partner / egg endpoints: bad input, someone else's dragon, not enough points", async () => {
    expect((await student.post("/api/dragon/partner", { data: {} })).status()).toBe(400);
    expect((await student.post("/api/dragon/partner", { data: { dragon_id: "nope" } })).status()).toBe(400);

    const foreign = await student.post("/api/dragon/partner", { data: { dragon_id: foreignDragonId } });
    expect(foreign.status()).toBe(404);
    const db = adminDb();
    const { data } = await db.from("dragons").select("is_partner").eq("id", foreignDragonId).single();
    expect(data.is_partner).toBe(false);

    const egg = await student.post("/api/dragon/egg");
    expect(egg.status()).toBe(400);
    expect((await egg.json()).error).toBe("แต้มไม่พอ");
  });
});
