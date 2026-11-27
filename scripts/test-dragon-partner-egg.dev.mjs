/**
 * Repeatable dev-only integration test for 20261126060000_dragon_partner_egg.sql.
 *
 * Usage:
 *   node scripts/test-dragon-partner-egg.dev.mjs
 *
 * Safety:
 *   - Reads `.env.local` and aborts unless NEXT_PUBLIC_SUPABASE_URL targets
 *     the E-learning-smac dev project (`nznvvtjvldroynmqhnkf`).
 *   - Uses unique `test_dpe_<timestamp>_*` fixtures and cleans them up in `finally`.
 *   - Kept outside `tests/` so `npm test` (`node --test tests/`) stays DB-free.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { DRAGON_GROWTH_THRESHOLDS } from "../lib/dragon-growth.ts";

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

const tag = `test_dpe_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const studentA = randomUUID();
const studentB = randomUUID();
const eggPrice = DRAGON_GROWTH_THRESHOLDS.eggPrice;

async function run() {
  try {
    const { error: usersErr } = await admin.from("users").insert([
      { id: studentA, name: `${tag}_a`, email: `${tag}_a@example.test`, role: "student" },
      { id: studentB, name: `${tag}_b`, email: `${tag}_b@example.test`, role: "student" },
    ]);
    if (usersErr) throw new Error(`Insert users failed: ${usersErr.message}`);

    // Seed 2 hatched dragons for studentA (d1 is partner, d2 is not) + 1 unhatched egg for studentB
    const hatchedAtSeed = new Date().toISOString();
    const { data: insertedDragons, error: dErr } = await admin
      .from("dragons")
      .insert([
        { user_id: studentA, species_id: "001", points: 5000, is_partner: true, hatched_at: hatchedAtSeed },
        { user_id: studentA, species_id: "002", points: 1000, is_partner: false, hatched_at: hatchedAtSeed },
        { user_id: studentB, species_id: "003", points: 0, is_partner: true, hatched_at: null },
      ])
      .select("id, user_id, is_partner, hatched_at");
    if (dErr) throw new Error(`Insert dragons failed: ${dErr.message}`);

    const a1 = insertedDragons.find((d) => d.user_id === studentA && d.is_partner);
    const a2 = insertedDragons.find((d) => d.user_id === studentA && !d.is_partner);
    const b1 = insertedDragons.find((d) => d.user_id === studentB);

    // 1. Set partner to another own dragon -> exactly one partner
    const { data: sp1, error: sp1Err } = await admin.rpc("dragon_set_partner", {
      p_user: studentA,
      p_dragon: a2.id,
    });
    assert.equal(sp1Err, null);
    assert.equal(sp1, "ok");

    const { data: aAfter } = await admin
      .from("dragons")
      .select("id, is_partner")
      .eq("user_id", studentA);
    assert.equal(aAfter.filter((d) => d.is_partner).length, 1);
    assert.equal(aAfter.find((d) => d.id === a2.id)?.is_partner, true);
    assert.equal(aAfter.find((d) => d.id === a1.id)?.is_partner, false);

    // 2. Set partner to someone else's dragon -> 'not_found' and nothing changes
    const { data: spOther, error: spOtherErr } = await admin.rpc("dragon_set_partner", {
      p_user: studentA,
      p_dragon: b1.id,
    });
    assert.equal(spOtherErr, null);
    assert.equal(spOther, "not_found");

    const { data: aAfterOther } = await admin
      .from("dragons")
      .select("id, is_partner")
      .eq("user_id", studentA);
    assert.equal(aAfterOther.find((d) => d.id === a2.id)?.is_partner, true);

    // 3. Buy egg with balance < price -> error and balance unchanged
    const { error: wErr } = await admin.from("dragon_wallets").insert([
      { user_id: studentA, balance: eggPrice - 1, lifetime: eggPrice - 1 },
      { user_id: studentB, balance: eggPrice, lifetime: eggPrice },
    ]);
    if (wErr) throw new Error(`Insert dragon_wallets failed: ${wErr.message}`);

    const { error: buyLowErr } = await admin.rpc("dragon_buy_egg", { p_user: studentA });
    assert.ok(buyLowErr, "Expected error when balance < eggPrice");
    const { data: wLow } = await admin
      .from("dragon_wallets")
      .select("balance")
      .eq("user_id", studentA)
      .single();
    assert.equal(wLow.balance, eggPrice - 1);

    // 4. Buy egg rejected while unhatched egg exists (studentB has b1 with hatched_at = null)
    const { error: buyOccupiedErr } = await admin.rpc("dragon_buy_egg", { p_user: studentB });
    assert.ok(buyOccupiedErr, "Expected error when user has an unhatched egg");
    assert.ok(
      buyOccupiedErr.message?.includes("incubator_occupied") || buyOccupiedErr.code === "P0002",
      `Expected incubator_occupied, got: ${buyOccupiedErr.code} ${buyOccupiedErr.message}`,
    );
    const { data: wBOccupied } = await admin
      .from("dragon_wallets")
      .select("balance")
      .eq("user_id", studentB)
      .single();
    assert.equal(wBOccupied.balance, eggPrice, "Balance must be unchanged when incubator is occupied");

    // 4b. dragon_hatch rejects below threshold and non-owner
    const { error: hatchLowErr } = await admin.rpc("dragon_hatch", {
      p_user: studentB,
      p_dragon: b1.id,
    });
    assert.ok(hatchLowErr, "dragon_hatch must reject when points < hatch threshold");

    const { error: hatchNotOwnerErr } = await admin.rpc("dragon_hatch", {
      p_user: studentA,
      p_dragon: b1.id,
    });
    assert.ok(hatchNotOwnerErr, "dragon_hatch must reject when caller is not the owner");

    // 4c. dragon_hatch succeeds at hatch threshold and is idempotent on repeat/concurrent calls
    const { error: updPtsErr } = await admin
      .from("dragons")
      .update({ points: DRAGON_GROWTH_THRESHOLDS.hatch })
      .eq("id", b1.id);
    assert.equal(updPtsErr, null);

    const { data: hatchRes1, error: hatchErr1 } = await admin.rpc("dragon_hatch", {
      p_user: studentB,
      p_dragon: b1.id,
    });
    assert.equal(hatchErr1, null, `dragon_hatch failed: ${hatchErr1?.message}`);
    assert.equal(hatchRes1?.id, b1.id);
    assert.ok(hatchRes1?.hatched_at, "dragon_hatch must set hatched_at");

    const [hatchRepeat, hatchConcurrent] = await Promise.all([
      admin.rpc("dragon_hatch", { p_user: studentB, p_dragon: b1.id }),
      admin.rpc("dragon_hatch", { p_user: studentB, p_dragon: b1.id }),
    ]);
    assert.equal(hatchRepeat.error, null);
    assert.equal(hatchConcurrent.error, null);
    assert.equal(hatchRepeat.data?.hatched_at, hatchRes1.hatched_at, "Repeat hatch must keep same hatched_at");
    assert.equal(hatchConcurrent.data?.hatched_at, hatchRes1.hatched_at, "Concurrent hatch must keep same hatched_at");

    // 4d. Buy egg with balance = price when incubator is empty and partner already exists -> is_partner = false
    const { data: boughtB, error: buyBErr } = await admin.rpc("dragon_buy_egg", { p_user: studentB });
    assert.equal(buyBErr, null, `dragon_buy_egg(B) failed: ${buyBErr?.message}`);
    assert.ok(boughtB);

    const { data: wB } = await admin
      .from("dragon_wallets")
      .select("balance")
      .eq("user_id", studentB)
      .single();
    assert.equal(wB.balance, 0);

    const { data: bDragons } = await admin
      .from("dragons")
      .select("id, is_partner, hatched_at")
      .eq("user_id", studentB);
    assert.equal(bDragons.length, 2);
    const boughtBRow = bDragons.find((d) => d.id === boughtB);
    assert.equal(boughtBRow?.is_partner, false);
    assert.equal(boughtBRow?.hatched_at, null);

    // 5. Delete studentB's partner, reset balance = eggPrice, buy -> becomes partner since none existed
    await admin.from("dragons").delete().eq("user_id", studentB);
    await admin.from("dragon_wallets").update({ balance: eggPrice }).eq("user_id", studentB);
    const { data: boughtBFirst, error: buyBFirstErr } = await admin.rpc("dragon_buy_egg", {
      p_user: studentB,
    });
    assert.equal(buyBFirstErr, null);
    const { data: bFirstRow } = await admin
      .from("dragons")
      .select("id, is_partner")
      .eq("id", boughtBFirst)
      .single();
    assert.equal(bFirstRow.is_partner, true);

    // 6. Two concurrent buy calls with balance for one egg -> exactly one succeeds
    await admin.from("dragon_wallets").update({ balance: eggPrice }).eq("user_id", studentA);
    const [r1, r2] = await Promise.all([
      admin.rpc("dragon_buy_egg", { p_user: studentA }),
      admin.rpc("dragon_buy_egg", { p_user: studentA }),
    ]);
    const successes = [r1, r2].filter((r) => !r.error && r.data);
    const failures = [r1, r2].filter((r) => r.error);
    assert.equal(successes.length, 1, "Exactly one concurrent buy must succeed");
    assert.equal(failures.length, 1, "Exactly one concurrent buy must fail");

    const { data: wAFinal } = await admin
      .from("dragon_wallets")
      .select("balance")
      .eq("user_id", studentA)
      .single();
    assert.equal(wAFinal.balance, 0);

    const { data: aDragonsFinal } = await admin
      .from("dragons")
      .select("id")
      .eq("user_id", studentA);
    assert.equal(aDragonsFinal.length, 3);

    // 7. Two concurrent partner changes for one owner (needs 20261126070000_dragon_fixes):
    //    both succeed, no unique-partner violation, exactly one partner remains.
    const targets = aDragonsFinal.slice(0, 2).map((d) => d.id);
    const [p1, p2] = await Promise.all(
      targets.map((id) => admin.rpc("dragon_set_partner", { p_user: studentA, p_dragon: id })),
    );
    assert.equal(p1.error, null, `concurrent set_partner(1): ${p1.error?.message}`);
    assert.equal(p2.error, null, `concurrent set_partner(2): ${p2.error?.message}`);
    const { data: aPartners } = await admin
      .from("dragons")
      .select("id")
      .eq("user_id", studentA)
      .eq("is_partner", true);
    assert.equal(aPartners.length, 1, "Exactly one partner after concurrent changes");

    console.log("PASS: all dragon_set_partner & dragon_buy_egg dev DB checks succeeded", {
      tag,
      concurrentSuccessId: successes[0].data,
      concurrentError: failures[0].error.message,
    });
  } finally {
    await admin.from("users").delete().in("id", [studentA, studentB]);
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
