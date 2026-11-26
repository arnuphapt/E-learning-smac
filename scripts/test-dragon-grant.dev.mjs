/**
 * Repeatable dev-only integration test for 20261126050000_dragon_points.sql.
 *
 * Usage:
 *   node scripts/test-dragon-grant.dev.mjs
 *
 * Safety:
 *   - Reads `.env.local` and aborts unless NEXT_PUBLIC_SUPABASE_URL targets
 *     the E-learning-smac dev project (`nznvvtjvldroynmqhnkf`).
 *   - Uses unique `test_dg_<timestamp>_*` fixtures and cleans them up in `finally`.
 *   - Kept outside `tests/` so `npm test` (`node --test tests/`) stays DB-free.
 */

import assert from "node:assert/strict";
import { createHmac, createPrivateKey, randomUUID, sign } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local"), quiet: true });

const DEV_PROJECT_REF = "nznvvtjvldroynmqhnkf";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl.includes(DEV_PROJECT_REF)) {
  throw new Error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL must point to dev (${DEV_PROJECT_REF}), got "${supabaseUrl}"`,
  );
}
if (!serviceRoleKey || !anonKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

function mintStudentJwt(userId) {
  const privateKeyEnv = process.env.SUPABASE_JWT_PRIVATE_KEY;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!privateKeyEnv && !secret) {
    throw new Error("Neither SUPABASE_JWT_PRIVATE_KEY nor SUPABASE_JWT_SECRET is set in .env.local");
  }
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    aud: "authenticated",
    role: "authenticated",
    sub: userId,
    app_role: "student",
    iat,
    exp: iat + 3600,
  };
  if (privateKeyEnv) {
    const jwk = JSON.parse(privateKeyEnv);
    const key = createPrivateKey({ key: jwk, format: "jwk" });
    const data = `${b64({ alg: "ES256", typ: "JWT", kid: jwk.kid })}.${b64(payload)}`;
    const sig = sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
    return `${data}.${sig}`;
  }
  const data = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tag = `test_dg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const hostId = randomUUID();
const student1Id = randomUUID();
const student2Id = randomUUID();
let hubId = null;
const sessionIds = [];

async function seedSession({ title, hubIdValue, questionsCount, student1PointsPerQ, student2Answer }) {
  const pin = String(Math.floor(100000 + Math.random() * 899999));
  const { data: course, error: courseErr } = await admin
    .from("courses_all")
    .select("id")
    .limit(1)
    .single();
  if (courseErr || !course) throw new Error(`Failed to fetch a course_id: ${courseErr?.message}`);

  const { data: session, error: sessErr } = await admin
    .from("live_sessions")
    .insert({
      pin,
      host_id: hostId,
      title,
      total: questionsCount,
      course_id: course.id,
      hub_id: hubIdValue,
      phase: "question",
      current_index: questionsCount - 1,
    })
    .select("id")
    .single();
  if (sessErr || !session) throw new Error(`Insert live_sessions failed: ${sessErr?.message}`);
  sessionIds.push(session.id);

  const questions = Array.from({ length: questionsCount }, (_, idx) => ({
    session_id: session.id,
    idx,
    text: `${tag} Q${idx + 1}`,
    choices: ["A", "B"],
    answer: 0,
    time_limit_sec: 20,
    points: student1PointsPerQ,
  }));
  const { error: qErr } = await admin.from("live_session_questions").insert(questions);
  if (qErr) throw new Error(`Insert live_session_questions failed: ${qErr.message}`);

  const { error: pErr } = await admin.from("live_players").insert([
    { session_id: session.id, user_id: student1Id, display_name: `${tag}_s1` },
    { session_id: session.id, user_id: student2Id, display_name: `${tag}_s2` },
  ]);
  if (pErr) throw new Error(`Insert live_players failed: ${pErr.message}`);

  const answers = Array.from({ length: questionsCount }, (_, idx) => ({
    session_id: session.id,
    question_idx: idx,
    user_id: student1Id,
    chosen: 0,
    correct: true,
    points: student1PointsPerQ,
  }));
  if (student2Answer) {
    answers.push({
      session_id: session.id,
      question_idx: 0,
      user_id: student2Id,
      chosen: 1,
      correct: false,
      points: 0,
    });
  }
  const { error: aErr } = await admin.from("live_answers").insert(answers);
  if (aErr) throw new Error(`Insert live_answers failed: ${aErr.message}`);

  return session.id;
}

async function run() {
  try {
    // 1. Create tagged host + 2 students
    const { error: usersErr } = await admin.from("users").insert([
      { id: hostId, name: `${tag}_host`, email: `${tag}_host@example.test`, role: "instructor" },
      { id: student1Id, name: `${tag}_s1`, email: `${tag}_s1@example.test`, role: "student" },
      { id: student2Id, name: `${tag}_s2`, email: `${tag}_s2@example.test`, role: "student" },
    ]);
    if (usersErr) throw new Error(`Insert users failed: ${usersErr.message}`);

    // 2. Create tagged hub
    const { data: hub, error: hubErr } = await admin
      .from("live_hubs")
      .insert({ host_id: hostId, name: `${tag}_hub`, year_level: [] })
      .select("id")
      .single();
    if (hubErr || !hub) throw new Error(`Insert live_hubs failed: ${hubErr?.message}`);
    hubId = hub.id;

    // 3. Session 1 (with hub): student1 gets 2 * 1000 = 2000 pts, student2 gets 0 pts
    const session1Id = await seedSession({
      title: `${tag}_s1`,
      hubIdValue: hubId,
      questionsCount: 2,
      student1PointsPerQ: 1000,
      student2Answer: true,
    });

    const { data: end1, error: end1Err } = await admin.rpc("live_session_end", {
      p_session: session1Id,
      p_expected_phase: "question",
      p_expected_index: 1,
    });
    assert.equal(end1Err, null, `live_session_end(1) error: ${end1Err?.message}`);
    assert.equal(end1, "ok");

    // (b) Idempotency: calling live_session_end again must not double-grant
    const { data: end1Again, error: end1AgainErr } = await admin.rpc("live_session_end", {
      p_session: session1Id,
      p_expected_phase: "ended",
      p_expected_index: 1,
    });
    assert.equal(end1AgainErr, null);
    assert.equal(end1Again, "ok");

    // (a) & (c) Verify grants, partner eggs, species validity, wallets
    const { data: speciesRows } = await admin.from("dragon_species").select("id");
    const validSpecies = new Set((speciesRows ?? []).map((r) => r.id));
    assert.equal(validSpecies.size, 11, "Expected 11 dragon_species rows");

    const { data: s1Dragons } = await admin.from("dragons").select("*").eq("user_id", student1Id);
    const { data: s2Dragons } = await admin.from("dragons").select("*").eq("user_id", student2Id);
    assert.equal(s1Dragons?.length, 1, "Student 1 should have 1 partner dragon");
    assert.equal(s1Dragons[0].is_partner, true);
    assert.equal(s1Dragons[0].points, 2000);
    assert.ok(validSpecies.has(s1Dragons[0].species_id), "Student 1 dragon species must be valid");

    assert.equal(s2Dragons?.length, 1, "Student 2 (0 pts) should still receive first partner egg");
    assert.equal(s2Dragons[0].is_partner, true);
    assert.equal(s2Dragons[0].points, 0);
    assert.ok(validSpecies.has(s2Dragons[0].species_id), "Student 2 dragon species must be valid");

    const { data: s1Wallet1 } = await admin.from("dragon_wallets").select("*").eq("user_id", student1Id).single();
    assert.equal(s1Wallet1.balance, 0);
    assert.equal(s1Wallet1.lifetime, 2000);

    const { data: s2Wallet1 } = await admin.from("dragon_wallets").select("*").eq("user_id", student2Id).single();
    assert.equal(s2Wallet1.balance, 0);
    assert.equal(s2Wallet1.lifetime, 0);

    const { data: grants1 } = await admin.from("dragon_point_grants").select("*").eq("session_id", session1Id);
    assert.equal(grants1?.length, 2, "Exactly 2 grant rows for session 1 (idempotent)");

    // Persisted outcome (needs 20261126070000_dragon_fixes): first egg + before/after + overflow
    const g1 = grants1.find((g) => g.user_id === student1Id);
    assert.equal(g1.first_egg, true);
    assert.equal(g1.dragon_id, s1Dragons[0].id);
    assert.equal(g1.points_before, 0);
    assert.equal(g1.points_after, 2000);
    assert.equal(g1.overflow, 0);

    // (e) Hub membership created for both players on hub session
    const { data: membersAfterHub } = await admin
      .from("live_hub_members")
      .select("user_id")
      .eq("hub_id", hubId);
    assert.equal(membersAfterHub?.length, 2, "Both players added to live_hub_members");

    // 4. Session 2 (null hub_id): 17 * 5000 = 85000 pts for student1 -> total 87000 -> cap 80000, overflow 7000
    const session2Id = await seedSession({
      title: `${tag}_s2`,
      hubIdValue: null,
      questionsCount: 17,
      student1PointsPerQ: 5000,
      student2Answer: false,
    });

    const { data: end2, error: end2Err } = await admin.rpc("live_session_end", {
      p_session: session2Id,
      p_expected_phase: "question",
      p_expected_index: 16,
    });
    assert.equal(end2Err, null, `live_session_end(2) error: ${end2Err?.message}`);
    assert.equal(end2, "ok");

    // (d) Verify level-5 cap (80000) + wallet overflow (7000) + lifetime (87000)
    const { data: s1Dragon2 } = await admin.from("dragons").select("*").eq("user_id", student1Id).single();
    assert.equal(s1Dragon2.points, 80000, "Dragon points must cap at 80000");

    const { data: s1Wallet2 } = await admin.from("dragon_wallets").select("*").eq("user_id", student1Id).single();
    assert.equal(s1Wallet2.balance, 7000, "Overflow past 80000 must go to wallet balance");
    assert.equal(s1Wallet2.lifetime, 87000, "Lifetime must equal total earned points");

    const { data: g2 } = await admin
      .from("dragon_point_grants")
      .select("*")
      .eq("session_id", session2Id)
      .eq("user_id", student1Id)
      .single();
    assert.equal(g2.first_egg, false);
    assert.equal(g2.points_before, 2000);
    assert.equal(g2.points_after, 80000);
    assert.equal(g2.overflow, 7000);

    // (e) Null-hub session must not add any extra live_hub_members rows
    const { data: membersAfterNull } = await admin
      .from("live_hub_members")
      .select("user_id")
      .in("user_id", [student1Id, student2Id]);
    assert.equal(membersAfterNull?.length, 2, "Null-hub session must not add hub members");

    // (f) Student RLS denial: student JWT cannot INSERT/UPDATE dragons or dragon_wallets
    const studentJwt = mintStudentJwt(student1Id);
    const studentClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${studentJwt}` } },
    });

    const { error: insDragonErr } = await studentClient.from("dragons").insert({
      user_id: student1Id,
      species_id: "001",
      points: 99999,
      is_partner: false,
    });
    assert.ok(insDragonErr, "Student INSERT into dragons must be denied by RLS");

    const { error: updDragonErr } = await studentClient
      .from("dragons")
      .update({ points: 123 })
      .eq("id", s1Dragon2.id);
    assert.ok(updDragonErr, "Student UPDATE on dragons must be denied by RLS");

    const { error: insWalletErr } = await studentClient.from("dragon_wallets").insert({
      user_id: student1Id,
      balance: 99999,
      lifetime: 99999,
    });
    assert.ok(insWalletErr, "Student INSERT into dragon_wallets must be denied by RLS");

    const { error: updWalletErr } = await studentClient
      .from("dragon_wallets")
      .update({ balance: 99999 })
      .eq("user_id", student1Id);
    assert.ok(updWalletErr, "Student UPDATE on dragon_wallets must be denied by RLS");

    // Verify student SELECT still succeeds on own rows
    const { data: ownDragons, error: selDragonErr } = await studentClient
      .from("dragons")
      .select("id, points")
      .eq("user_id", student1Id);
    assert.equal(selDragonErr, null);
    assert.equal(ownDragons?.length, 1);

    console.log("PASS: all dragon_grant_session dev DB checks succeeded", {
      tag,
      s1DragonPoints: s1Dragon2.points,
      s1WalletBalance: s1Wallet2.balance,
      s1WalletLifetime: s1Wallet2.lifetime,
      s2DragonPoints: s2Dragons[0].points,
      hubMembersCount: membersAfterNull.length,
      rlsErrors: {
        insDragon: insDragonErr.code ?? insDragonErr.message,
        updDragon: updDragonErr.code ?? updDragonErr.message,
        insWallet: insWalletErr.code ?? insWalletErr.message,
        updWallet: updWalletErr.code ?? updWalletErr.message,
      },
    });
  } finally {
    if (sessionIds.length > 0) {
      await admin.from("live_sessions").delete().in("id", sessionIds);
    }
    if (hubId) {
      await admin.from("live_hubs").delete().eq("id", hubId);
    }
    await admin.from("users").delete().in("id", [hostId, student1Id, student2Id]);
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
