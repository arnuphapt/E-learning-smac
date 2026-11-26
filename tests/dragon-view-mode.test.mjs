import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { toHatcherySave } from "../lib/dragon-scene.ts";
import { createHatchery, HATCHERY_KEY } from "../lib/dragon/hatchery.mjs";
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
        { id: "v-egg", species_id: "001", points: 100, created_at: "2026-11-26T10:00:00Z" },
        { id: "v-baby", species_id: "002", points: 2_500, created_at: "2026-11-26T09:00:00Z" },
        { id: "v-adult", species_id: "003", points: 60_000, created_at: "2026-11-26T08:00:00Z" },
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
    assert.equal(snap.adults[0].level, 4);
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
