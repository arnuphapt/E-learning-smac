import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ARRIVAL_DURATION_MS,
  SUMMON_DURATION_MS,
  toHatcherySave,
  toSummoningHatcherySave,
} from "../lib/dragon-scene.ts";
import { createHatchery, HATCHERY_KEY } from "../lib/dragon/hatchery.mjs";

const MAP_PATH = path.resolve("public/dragon/data/source-map.json");
const CATALOG_PATH = path.resolve("public/dragon/generated/hatching/catalog.json");

function createMemoryStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

test("toHatcherySave converts egg, baby, and level-3 adult into a valid hatchery snapshot", (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

  const save = toHatcherySave(
    [
      {
        id: "d-egg",
        species_id: "001",
        points: 200,
        created_at: "2026-11-26T10:00:00Z",
      },
      {
        id: "d-baby",
        species_id: "002",
        points: 2_000,
        created_at: "2026-11-26T09:00:00Z",
      },
      {
        id: "d-adult",
        species_id: "003",
        points: 40_000,
        created_at: "2026-11-26T08:00:00Z",
      },
    ],
    map
  );

  const storage = createMemoryStorage({
    [HATCHERY_KEY]: JSON.stringify(save),
  });

  const hatchery = createHatchery({
    catalog,
    map,
    storage,
    now: () => 1_000,
  });

  const snapshot = hatchery.getSnapshot();
  assert.equal(snapshot.active?.id, "d-egg");
  assert.equal(snapshot.active?.speciesId, "001");
  assert.equal(snapshot.active?.status, "incubating");

  assert.equal(snapshot.babies.length, 1);
  assert.equal(snapshot.babies[0].id, "d-baby");
  assert.equal(snapshot.babies[0].speciesId, "002");

  assert.equal(snapshot.adults.length, 1);
  assert.equal(snapshot.adults[0].id, "d-adult");
  assert.equal(snapshot.adults[0].speciesId, "003");
  assert.equal(snapshot.adults[0].level, 3);
});

test("toHatcherySave keeps the newest nursery dragons when eggs+babies exceed Egg_Slot count", (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const slotCount = map.MapItemData.filter(
    (item) => item.isMarker && item.SymbolID === "Egg_Slot"
  ).length;

  const manyBabies = Array.from({ length: slotCount + 3 }, (_, idx) => ({
    id: `baby-${idx}`,
    species_id: "001",
    points: 2_000,
    created_at: new Date(Date.UTC(2026, 10, 1, 0, idx)).toISOString(),
  }));

  const save = toHatcherySave(manyBabies, map);
  assert.equal(save.babies.length, slotCount);
  assert.equal(save.babies[0].id, `baby-${slotCount + 2}`);

  const storage = createMemoryStorage({
    [HATCHERY_KEY]: JSON.stringify(save),
  });
  const hatchery = createHatchery({ catalog, map, storage, now: () => 1_000 });
  assert.equal(hatchery.getSnapshot().babies.length, slotCount);
});

test("toHatcherySave flags eggs beyond the first as eggs, never babies", (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const at = (m) => new Date(Date.UTC(2026, 10, 1, 0, m)).toISOString();
  const save = toHatcherySave(
    [
      { id: "egg-1", species_id: "001", points: 0, created_at: at(1) },
      { id: "egg-2", species_id: "001", points: 0, created_at: at(2) },
      { id: "egg-3", species_id: "002", points: 500, created_at: at(3) },
      { id: "baby-1", species_id: "002", points: 2_000, created_at: at(4) },
    ],
    map
  );

  assert.equal(save.active?.id, "egg-3");
  assert.deepEqual(
    save.babies.map((b) => [b.id, b.isEgg === true]),
    [
      ["egg-2", true],
      ["egg-1", true],
      ["baby-1", false],
    ]
  );

  const storage = createMemoryStorage({ [HATCHERY_KEY]: JSON.stringify(save) });
  const hatchery = createHatchery({ catalog, map, storage, now: () => 1_000 });
  assert.equal(hatchery.getSnapshot().babies.filter((b) => b.isEgg).length, 2);
});

test("toHatcherySave sets readyAt in the past for ready unhatched eggs and far future for not-ready eggs", (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

  const notReadySave = toHatcherySave(
    [{ id: "egg-low", species_id: "001", points: 999, hatched_at: null }],
    map
  );
  assert.equal(notReadySave.active?.phase, "incubating");
  assert.ok((notReadySave.active?.readyAt ?? 0) > Date.now());

  const notReadyHatchery = createHatchery({
    catalog,
    map,
    storage: createMemoryStorage({ [HATCHERY_KEY]: JSON.stringify(notReadySave) }),
    now: () => 10_000,
  });
  assert.equal(notReadyHatchery.getSnapshot().active?.status, "incubating");

  const readySave = toHatcherySave(
    [{ id: "egg-high", species_id: "001", points: 25_000, hatched_at: null }],
    map
  );
  assert.equal(readySave.active?.id, "egg-high");
  assert.equal(readySave.active?.phase, "incubating");
  assert.ok((readySave.active?.readyAt ?? 9_999_999_999_999) <= 10_000);
  assert.equal(readySave.adults.length, 0);

  const readyHatchery = createHatchery({
    catalog,
    map,
    storage: createMemoryStorage({ [HATCHERY_KEY]: JSON.stringify(readySave) }),
    now: () => 10_000,
  });
  assert.equal(readyHatchery.getSnapshot().active?.status, "ready");
});

test("toHatcherySave renders a hub mix of multiple unhatched eggs and hatched dragons", (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const save = toHatcherySave(
    [
      { id: "s1-egg-ready", species_id: "001", points: 25_000, hatched_at: null },
      { id: "s2-egg-low", species_id: "002", points: 300, hatched_at: null },
      { id: "s3-baby", species_id: "003", points: 2_000, hatched_at: "2026-11-26T00:00:00Z" },
      { id: "s4-adult", species_id: "001", points: 35_000, hatched_at: "2026-11-26T00:00:00Z" },
    ],
    map
  );

  assert.equal(save.active?.id, "s1-egg-ready");
  assert.equal(save.active?.phase, "incubating");
  assert.deepEqual(
    save.babies.map((b) => [b.id, b.isEgg === true]),
    [
      ["s2-egg-low", true],
      ["s3-baby", false],
    ]
  );
  assert.equal(save.adults.length, 1);
  assert.equal(save.adults[0].id, "s4-adult");
  assert.equal(save.adults[0].level, 3);

  const hatchery = createHatchery({
    catalog,
    map,
    storage: createMemoryStorage({ [HATCHERY_KEY]: JSON.stringify(save) }),
    now: () => 10_000,
  });
  const snap = hatchery.getSnapshot();
  assert.equal(snap.active?.id, "s1-egg-ready");
  assert.equal(snap.babies.filter((b) => b.isEgg).length, 1);
  assert.equal(snap.adults.length, 1);
});

test("toSummoningHatcherySave starts DB egg in summoning and advances summoning -> arriving -> incubating", (t) => {
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

  let nowMs = 10_000;
  const save = toSummoningHatcherySave(
    { id: "db-egg-1", species_id: "002", points: 0, hatched_at: null },
    map,
    nowMs
  );

  assert.equal(save.active?.id, "db-egg-1");
  assert.equal(save.active?.speciesId, "002");
  assert.equal(save.active?.phase, "summoning");
  assert.equal(save.active?.summonDoneAt, nowMs + SUMMON_DURATION_MS);
  assert.equal(save.active?.startedAt, nowMs + SUMMON_DURATION_MS + ARRIVAL_DURATION_MS);

  const store = new Map([[HATCHERY_KEY, JSON.stringify(save)]]);
  const hatchery = createHatchery({
    catalog,
    map,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    now: () => nowMs,
  });

  assert.equal(hatchery.getSnapshot().active?.status, "summoning");

  nowMs = 10_000 + SUMMON_DURATION_MS;
  hatchery.tick();
  assert.equal(hatchery.getSnapshot().active?.status, "arriving");

  nowMs = 10_000 + SUMMON_DURATION_MS + ARRIVAL_DURATION_MS;
  hatchery.tick();
  assert.equal(hatchery.getSnapshot().active?.status, "incubating");
  assert.equal(hatchery.getSnapshot().active?.speciesId, "002");
});
