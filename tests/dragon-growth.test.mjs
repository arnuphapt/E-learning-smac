import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRAGON_GROWTH_THRESHOLDS,
  MAX_DRAGON_POINTS,
  getDragonGrowthState,
  applyDragonPointGrant,
  canBuyDragonEgg,
} from "../lib/dragon-growth.ts";

test("threshold table exposes expected values", () => {
  assert.equal(DRAGON_GROWTH_THRESHOLDS.hatch, 1_000);
  assert.equal(DRAGON_GROWTH_THRESHOLDS.adult, 5_000);
  assert.deepEqual(DRAGON_GROWTH_THRESHOLDS.levels, [10_000, 20_000, 35_000, 55_000, 80_000]);
  assert.equal(DRAGON_GROWTH_THRESHOLDS.eggPrice, 20_000);
  assert.equal(MAX_DRAGON_POINTS, 80_000);
});

test("growth boundaries: egg -> baby -> adult -> levels 1..5", () => {
  assert.deepEqual(getDragonGrowthState(0), { stage: "egg", level: 0, nextAt: 1_000, toNext: 1_000 });
  assert.deepEqual(getDragonGrowthState(999), { stage: "egg", level: 0, nextAt: 1_000, toNext: 1 });

  assert.deepEqual(getDragonGrowthState(1_000), { stage: "baby", level: 0, nextAt: 5_000, toNext: 4_000 });
  assert.deepEqual(getDragonGrowthState(1_001), { stage: "baby", level: 0, nextAt: 5_000, toNext: 3_999 });
  assert.deepEqual(getDragonGrowthState(4_999), { stage: "baby", level: 0, nextAt: 5_000, toNext: 1 });

  assert.deepEqual(getDragonGrowthState(5_000), { stage: "adult", level: 0, nextAt: 10_000, toNext: 5_000 });
  assert.deepEqual(getDragonGrowthState(5_001), { stage: "adult", level: 0, nextAt: 10_000, toNext: 4_999 });
  assert.deepEqual(getDragonGrowthState(9_999), { stage: "adult", level: 0, nextAt: 10_000, toNext: 1 });

  assert.deepEqual(getDragonGrowthState(10_000), { stage: "adult", level: 1, nextAt: 20_000, toNext: 10_000 });
  assert.deepEqual(getDragonGrowthState(10_001), { stage: "adult", level: 1, nextAt: 20_000, toNext: 9_999 });
  assert.deepEqual(getDragonGrowthState(19_999), { stage: "adult", level: 1, nextAt: 20_000, toNext: 1 });

  assert.deepEqual(getDragonGrowthState(20_000), { stage: "adult", level: 2, nextAt: 35_000, toNext: 15_000 });
  assert.deepEqual(getDragonGrowthState(20_001), { stage: "adult", level: 2, nextAt: 35_000, toNext: 14_999 });
  assert.deepEqual(getDragonGrowthState(34_999), { stage: "adult", level: 2, nextAt: 35_000, toNext: 1 });

  assert.deepEqual(getDragonGrowthState(35_000), { stage: "adult", level: 3, nextAt: 55_000, toNext: 20_000 });
  assert.deepEqual(getDragonGrowthState(35_001), { stage: "adult", level: 3, nextAt: 55_000, toNext: 19_999 });
  assert.deepEqual(getDragonGrowthState(54_999), { stage: "adult", level: 3, nextAt: 55_000, toNext: 1 });

  assert.deepEqual(getDragonGrowthState(55_000), { stage: "adult", level: 4, nextAt: 80_000, toNext: 25_000 });
  assert.deepEqual(getDragonGrowthState(55_001), { stage: "adult", level: 4, nextAt: 80_000, toNext: 24_999 });
  assert.deepEqual(getDragonGrowthState(79_999), { stage: "adult", level: 4, nextAt: 80_000, toNext: 1 });

  assert.deepEqual(getDragonGrowthState(80_000), { stage: "adult", level: 5, nextAt: null, toNext: 0 });
  assert.deepEqual(getDragonGrowthState(80_001), { stage: "adult", level: 5, nextAt: null, toNext: 0 });
  assert.deepEqual(getDragonGrowthState(150_000), { stage: "adult", level: 5, nextAt: null, toNext: 0 });
});

test("applyDragonPointGrant caps at level 5 and splits overflow", () => {
  assert.deepEqual(applyDragonPointGrant(0, 0), { newPoints: 0, overflow: 0 });
  assert.deepEqual(applyDragonPointGrant(500, 1_000), { newPoints: 1_500, overflow: 0 });
  assert.deepEqual(applyDragonPointGrant(79_000, 1_000), { newPoints: 80_000, overflow: 0 });
  assert.deepEqual(applyDragonPointGrant(78_500, 2_500), { newPoints: 80_000, overflow: 1_000 });
  assert.deepEqual(applyDragonPointGrant(80_000, 3_000), { newPoints: 80_000, overflow: 3_000 });
  assert.deepEqual(applyDragonPointGrant(80_000, 0), { newPoints: 80_000, overflow: 0 });
});

test("canBuyDragonEgg checks egg price boundary", () => {
  assert.equal(canBuyDragonEgg(0), false);
  assert.equal(canBuyDragonEgg(19_999), false);
  assert.equal(canBuyDragonEgg(20_000), true);
  assert.equal(canBuyDragonEgg(20_001), true);
});

test("negative or non-integer inputs throw", () => {
  for (const bad of [-1, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => getDragonGrowthState(bad), RangeError);
    assert.throws(() => applyDragonPointGrant(bad, 100), RangeError);
    assert.throws(() => applyDragonPointGrant(100, bad), RangeError);
    assert.throws(() => canBuyDragonEgg(bad), RangeError);
  }
});
