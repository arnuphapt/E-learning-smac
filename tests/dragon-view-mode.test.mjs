import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { toHatcherySave } from "../lib/dragon-scene.ts";
import { createHatchery, HATCHERY_KEY } from "../lib/dragon/hatchery.mjs";
import {
  getViewOnlySummonDeadline,
  handleViewOnlyHatchInteraction,
  handleViewOnlySummonTap,
  shouldRenderViewOnlySummonButton,
} from "../lib/dragon/hatchery-panel.mjs";
import { createWallet } from "../lib/dragon/wallet.mjs";

const MAP_PATH = path.resolve("public/dragon/data/source-map.json");
const CATALOG_PATH = path.resolve("public/dragon/generated/hatching/catalog.json");

test("viewOnly hatchery + wallet path with in-memory storage never touches globalThis.localStorage", (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const calls = [];
  const spyLocalStorage = {
    getItem: (k) => {
      calls.push(["getItem", k]);
      return null;
    },
    setItem: (k, v) => {
      calls.push(["setItem", k, v]);
    },
    removeItem: (k) => {
      calls.push(["removeItem", k]);
    },
    clear: () => {
      calls.push(["clear"]);
    },
  };

  const prevDesc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: spyLocalStorage,
  });

  try {
    const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    const save = toHatcherySave(
      [
        { id: "v-egg", species_id: "001", points: 5, created_at: "2026-11-26T10:00:00Z" },
        { id: "v-baby", species_id: "002", points: 25, created_at: "2026-11-26T09:00:00Z" },
        { id: "v-adult", species_id: "003", points: 50, created_at: "2026-11-26T08:00:00Z" },
      ],
      map
    );

    const store = new Map([[HATCHERY_KEY, JSON.stringify(save)]]);
    const memoryStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
    };

    const wallet = createWallet({ storage: null, chopCosts: {} });
    const hatchery = createHatchery({
      catalog,
      map,
      storage: memoryStorage,
      expansions: null,
      wallet,
      now: () => 1_000,
    });

    const snap = hatchery.getSnapshot();
    assert.equal(snap.active?.id, "v-egg");
    assert.equal(snap.babies.length, 1);
    assert.equal(snap.adults.length, 1);
    assert.equal(snap.adults[0].speciesId, "003");
    assert.equal(wallet.getSnapshot().SC, 0);
    assert.deepEqual(calls, []);
  } finally {
    if (prevDesc) {
      Object.defineProperty(globalThis, "localStorage", prevDesc);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("handleViewOnlyHatchInteraction respects allowHatch, readiness, API failure, and repeat-tap guard", async (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const makeHatchery = (points) => {
    const save = toHatcherySave(
      [{ id: "egg-1", species_id: "001", points, hatched_at: null }],
      map
    );
    const store = new Map([[HATCHERY_KEY, JSON.stringify(save)]]);
    return createHatchery({
      catalog,
      map,
      storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
      now: () => 10_000,
    });
  };

  // 1. allowHatch = false -> tap ignored
  {
    const h = makeHatchery(20);
    let hatchCalls = 0;
    let notReadyCalls = 0;
    let inFlight = false;
    const ran = await handleViewOnlyHatchInteraction({
      active: h.getSnapshot().active,
      actorId: "egg-1",
      allowHatch: false,
      hatchingInFlight: inFlight,
      setHatchingInFlight: (v) => { inFlight = v; },
      hatch: () => h.hatch(),
      onHatch: () => { hatchCalls++; },
      onHatchNotReady: () => { notReadyCalls++; },
    });
    assert.equal(ran, false);
    assert.equal(hatchCalls, 0);
    assert.equal(notReadyCalls, 0);
    assert.equal(h.getSnapshot().active?.status, "ready");
  }

  // 2. allowHatch = true + not ready -> fires onHatchNotReady, does not hatch
  {
    const h = makeHatchery(5);
    let hatchCalls = 0;
    const notReadyIds = [];
    let inFlight = false;
    const ran = await handleViewOnlyHatchInteraction({
      active: h.getSnapshot().active,
      actorId: "egg-1",
      allowHatch: true,
      hatchingInFlight: inFlight,
      setHatchingInFlight: (v) => { inFlight = v; },
      hatch: () => h.hatch(),
      onHatch: () => { hatchCalls++; },
      onHatchNotReady: (id) => { notReadyIds.push(id); },
    });
    assert.equal(ran, false);
    assert.equal(hatchCalls, 0);
    assert.deepEqual(notReadyIds, ["egg-1"]);
    assert.equal(h.getSnapshot().active?.status, "incubating");
  }

  // 3. allowHatch = true + onHatch returns false -> does not hatch, resets guard
  {
    const h = makeHatchery(20);
    let inFlight = false;
    const ran = await handleViewOnlyHatchInteraction({
      active: h.getSnapshot().active,
      actorId: "egg-1",
      allowHatch: true,
      hatchingInFlight: inFlight,
      setHatchingInFlight: (v) => { inFlight = v; },
      hatch: () => h.hatch(),
      onHatch: async () => false,
    });
    assert.equal(ran, false);
    assert.equal(inFlight, false);
    assert.equal(h.getSnapshot().active?.status, "ready");
  }

  // 4. allowHatch = true + ready -> calls onHatch, runs hatch(), schedules onHatchComplete, blocks repeat tap
  {
    const h = makeHatchery(20);
    const hatchedIds = [];
    const completedIds = [];
    const scheduled = [];
    let inFlight = false;
    const ran = await handleViewOnlyHatchInteraction({
      active: h.getSnapshot().active,
      actorId: "egg-1",
      allowHatch: true,
      hatchingInFlight: inFlight,
      setHatchingInFlight: (v) => { inFlight = v; },
      hatch: () => h.hatch(),
      onHatch: async (id) => {
        hatchedIds.push(id);
        return true;
      },
      onHatchComplete: (id) => { completedIds.push(id); },
      schedule: (fn, ms) => { scheduled.push({ fn, ms }); },
      now: () => 10_000,
    });
    assert.equal(ran, true);
    assert.deepEqual(hatchedIds, ["egg-1"]);
    assert.equal(h.getSnapshot().active?.status, "hatching");
    assert.equal(scheduled.length, 1);

    const repeat = await handleViewOnlyHatchInteraction({
      active: h.getSnapshot().active,
      actorId: "egg-1",
      allowHatch: true,
      hatchingInFlight: inFlight,
      setHatchingInFlight: (v) => { inFlight = v; },
      hatch: () => h.hatch(),
      onHatch: async (id) => { hatchedIds.push(id); return true; },
    });
    assert.equal(repeat, false);
    assert.deepEqual(hatchedIds, ["egg-1"]);

    scheduled[0].fn();
    assert.deepEqual(completedIds, ["egg-1"]);
  }
});

test("getViewOnlySummonDeadline only schedules summon phases when allowSummonTick is on", () => {
  const summoning = { status: "summoning", summonDoneAt: 5_000, startedAt: 7_000 };
  const arriving = { status: "arriving", summonDoneAt: 5_000, startedAt: 7_000 };
  const incubating = { status: "incubating", summonDoneAt: 5_000, startedAt: 7_000 };

  assert.equal(getViewOnlySummonDeadline(summoning, false), null);
  assert.equal(getViewOnlySummonDeadline(arriving, false), null);
  assert.equal(getViewOnlySummonDeadline(summoning, true), 5_000);
  assert.equal(getViewOnlySummonDeadline(arriving, true), 7_000);
  assert.equal(getViewOnlySummonDeadline(incubating, true), null);
});

test("viewOnly SummonButton visibility and tap respect allowSummon and active egg state", () => {
  const catalog = { summoning: { buttonImage: "/generated/summon-button.webp" } };
  const emptyView = { active: null };
  const activeView = { active: { id: "egg-1", status: "incubating" } };

  // allowSummon off -> hidden & inert
  assert.equal(
    shouldRenderViewOnlySummonButton({ viewOnly: true, allowSummon: false, view: emptyView, catalog }),
    false
  );
  let requested = 0;
  assert.equal(
    handleViewOnlySummonTap({ allowSummon: false, active: null, onSummonRequest: () => { requested++; } }),
    false
  );
  assert.equal(requested, 0);

  // allowSummon on + no active egg -> visible & fires onSummonRequest
  assert.equal(
    shouldRenderViewOnlySummonButton({ viewOnly: true, allowSummon: true, view: emptyView, catalog }),
    true
  );
  assert.equal(
    handleViewOnlySummonTap({ allowSummon: true, active: null, onSummonRequest: () => { requested++; } }),
    true
  );
  assert.equal(requested, 1);

  // nest full (disabled) -> does not fire
  assert.equal(
    handleViewOnlySummonTap({ allowSummon: true, active: null, disabled: true, onSummonRequest: () => { requested++; } }),
    false
  );
  assert.equal(requested, 1);

  // active egg present -> no summon button & inert
  assert.equal(
    shouldRenderViewOnlySummonButton({ viewOnly: true, allowSummon: true, view: activeView, catalog }),
    false
  );
  assert.equal(
    handleViewOnlySummonTap({ allowSummon: true, active: activeView.active, onSummonRequest: () => { requested++; } }),
    false
  );
  assert.equal(requested, 1);
});
