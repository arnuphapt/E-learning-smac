/**
 * Repeatable dev-only integration test for `lib/hub-dragons.ts`
 * (`getHubDragons` and `getMyPlayedHubs`).
 *
 * Usage:
 *   node scripts/test-hub-dragons.dev.mjs
 *
 * Note: Tests the extracted query functions directly against dev Supabase
 * because Next.js route handlers require a running Next.js server/cookies.
 *
 * Safety:
 *   - Reads `.env.local` and aborts unless NEXT_PUBLIC_SUPABASE_URL targets
 *     the E-learning-smac dev project (`nznvvtjvldroynmqhnkf`).
 *   - Uses unique `test_hd_<timestamp>_*` fixtures and cleans them up in `finally`.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getHubDragons, getMyPlayedHubs } from "../lib/hub-dragons.ts";

dotenv.config({ path: path.resolve(".env.local"), quiet: true });

const DEV_PROJECT_REF = "nznvvtjvldroynmqhnkf";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl.includes(DEV_PROJECT_REF)) {
  throw new Error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL must point to dev (${DEV_PROJECT_REF}), got "${supabaseUrl}"`,
  );
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tag = `test_hd_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const hostId = randomUUID();
const outsiderId = randomUUID();
const memberIds = Array.from({ length: 43 }, () => randomUUID());
let hubId = null;

async function run() {
  try {
    const userRows = [
      { id: hostId, name: `${tag}_host`, email: `${tag}_host@example.test`, role: "instructor" },
      { id: outsiderId, name: `${tag}_out`, email: `${tag}_out@example.test`, role: "student" },
      ...memberIds.map((id, i) => ({
        id,
        name: `${tag}_m${i}`,
        email: `${tag}_m${i}@example.test`,
        role: "student",
      })),
    ];
    const { error: uErr } = await admin.from("users").insert(userRows);
    if (uErr) throw new Error(`Insert users failed: ${uErr.message}`);

    const { data: hub, error: hErr } = await admin
      .from("live_hubs")
      .insert({ host_id: hostId, name: `${tag}_hub`, year_level: [1, 2] })
      .select("id")
      .single();
    if (hErr || !hub) throw new Error(`Insert live_hubs failed: ${hErr?.message}`);
    hubId = hub.id;

    const baseTime = Date.UTC(2026, 10, 1, 0, 0, 0);
    const memberRows = memberIds.map((userId, i) => ({
      hub_id: hubId,
      user_id: userId,
      first_played_at: new Date(baseTime + i * 1000).toISOString(),
    }));
    const { error: mErr } = await admin.from("live_hub_members").insert(memberRows);
    if (mErr) throw new Error(`Insert live_hub_members failed: ${mErr.message}`);

    // 42 members have partner dragons (egg=9, babies=10..49, newest adult=50); memberIds[42] has NO partner dragon
    const dragonRows = memberIds.slice(0, 42).map((userId, i) => ({
      user_id: userId,
      species_id: "001",
      points: Math.min(50, 9 + i),
      hatched_at: i === 0 ? null : new Date(baseTime + i * 1000).toISOString(),
      is_partner: true,
    }));
    const { error: dErr } = await admin.from("dragons").insert(dragonRows);
    if (dErr) throw new Error(`Insert dragons failed: ${dErr.message}`);

    // 1. Member sees partner dragons (capped at 40, total_members = 43, no personal fields)
    const memberView = await getHubDragons(admin, hubId, memberIds[0]);
    assert.equal(memberView.status, 200);
    assert.equal(memberView.data.total_members, 43);
    assert.equal(memberView.data.dragons.length, 40);
    // Newest with partner is memberIds[41] -> points = 50 (adult, final stage)
    assert.equal(memberView.data.dragons[0].points, 50);
    assert.equal(memberView.data.dragons[0].growth.stage, "adult");

    for (const d of memberView.data.dragons) {
      assert.deepEqual(Object.keys(d).sort(), ["growth", "hatched_at", "is_partner", "points", "species_id"]);
    }
    assert.deepEqual(Object.keys(memberView.data.hub).sort(), ["id", "name", "year_level"]);

    // 1b. Needs migration 20261126070000_dragon_fixes: ordering + LIMIT happen in SQL.
    const { data: scene, error: sceneErr } = await admin.rpc("dragon_hub_scene", {
      p_hub: hubId,
      p_limit: 5,
    });
    assert.equal(sceneErr, null);
    assert.equal(scene.total_members, 43);
    assert.equal(scene.dragons.length, 5);
    assert.equal(scene.dragons[0].points, 50);
    assert.deepEqual(Object.keys(scene.dragons[0]).sort(), ["hatched_at", "points", "species_id"]);

    // 2. Host also sees partner dragons
    const hostView = await getHubDragons(admin, hubId, hostId);
    assert.equal(hostView.status, 200);
    assert.equal(hostView.data.dragons.length, 40);

    // 3. Non-member is refused (403)
    const outsiderView = await getHubDragons(admin, hubId, outsiderId);
    assert.equal(outsiderView.status, 403);

    // 4. getMyPlayedHubs returns hub with member_count = 43 for member, empty for outsider
    const myHubs = await getMyPlayedHubs(admin, memberIds[0]);
    assert.equal(myHubs.length, 1);
    assert.equal(myHubs[0].id, hubId);
    assert.equal(myHubs[0].member_count, 43);

    const outsiderHubs = await getMyPlayedHubs(admin, outsiderId);
    assert.equal(outsiderHubs.length, 0);

    console.log("PASS: all hub-dragons dev DB checks succeeded", {
      tag,
      totalMembers: memberView.data.total_members,
      returnedDragons: memberView.data.dragons.length,
      outsiderStatus: outsiderView.status,
    });
  } finally {
    if (hubId) {
      await admin.from("live_hubs").delete().eq("id", hubId);
    }
    await admin.from("users").delete().in("id", [hostId, outsiderId, ...memberIds]);
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
