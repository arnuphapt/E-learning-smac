import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { toHatcherySave } from "../lib/dragon-scene.ts";
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
