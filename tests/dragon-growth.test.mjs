import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRAGON_GROWTH_THRESHOLDS,
  MAX_DRAGON_POINTS,
  getDragonGrowthState,
  applyDragonPointGrant,
  canBuyDragonEgg,
  formatDragonGrowthThai,
} from "../lib/dragon-growth.ts";

test("threshold table exposes expected values", () => {
  assert.equal(DRAGON_GROWTH_THRESHOLDS.hatch, 10);
  assert.equal(DRAGON_GROWTH_THRESHOLDS.adult, 50);
  assert.equal(DRAGON_GROWTH_THRESHOLDS.eggPrice, 200);
  assert.equal(MAX_DRAGON_POINTS, 50);
});

test("growth boundaries: egg -> baby -> adult (final stage)", () => {
  assert.deepEqual(getDragonGrowthState(0), { stage: "egg", nextAt: 10, toNext: 10, readyToHatch: false });
  assert.deepEqual(getDragonGrowthState(9), { stage: "egg", nextAt: 10, toNext: 1, readyToHatch: false });

  assert.deepEqual(getDragonGrowthState(10), { stage: "baby", nextAt: 50, toNext: 40, readyToHatch: false });
  assert.deepEqual(getDragonGrowthState(11), { stage: "baby", nextAt: 50, toNext: 39, readyToHatch: false });
  assert.deepEqual(getDragonGrowthState(49), { stage: "baby", nextAt: 50, toNext: 1, readyToHatch: false });

  assert.deepEqual(getDragonGrowthState(50), { stage: "adult", nextAt: null, toNext: 0, readyToHatch: false });
  assert.deepEqual(getDragonGrowthState(51), { stage: "adult", nextAt: null, toNext: 0, readyToHatch: false });
  assert.deepEqual(getDragonGrowthState(150), { stage: "adult", nextAt: null, toNext: 0, readyToHatch: false });
});

test("unhatched dragon stays egg at any points and sets readyToHatch at threshold", () => {
  assert.deepEqual(getDragonGrowthState(0, false), { stage: "egg", nextAt: 10, toNext: 10, readyToHatch: false });
  assert.deepEqual(getDragonGrowthState(9, false), { stage: "egg", nextAt: 10, toNext: 1, readyToHatch: false });
  assert.deepEqual(getDragonGrowthState(10, false), { stage: "egg", nextAt: 10, toNext: 0, readyToHatch: true });
  assert.deepEqual(getDragonGrowthState(25, false), { stage: "egg", nextAt: 10, toNext: 0, readyToHatch: true });
  assert.deepEqual(getDragonGrowthState(50, false), { stage: "egg", nextAt: 10, toNext: 0, readyToHatch: true });

  assert.equal(formatDragonGrowthThai(getDragonGrowthState(9, false)), "ไข่");
  assert.equal(formatDragonGrowthThai(getDragonGrowthState(10, false)), "ไข่ (พร้อมฟัก)");
});

test("hatched dragon with accumulated points jumps straight to adult", () => {
  const skippedToAdult = getDragonGrowthState(50, true);
  assert.equal(skippedToAdult.stage, "adult");
  assert.equal(skippedToAdult.readyToHatch, false);
  assert.equal(formatDragonGrowthThai(skippedToAdult), "ตัวเต็มวัย");
});

test("applyDragonPointGrant caps at adult (50) and splits overflow", () => {
  assert.deepEqual(applyDragonPointGrant(0, 0), { newPoints: 0, overflow: 0 });
  assert.deepEqual(applyDragonPointGrant(5, 10), { newPoints: 15, overflow: 0 });
  assert.deepEqual(applyDragonPointGrant(40, 10), { newPoints: 50, overflow: 0 });
  assert.deepEqual(applyDragonPointGrant(35, 25), { newPoints: 50, overflow: 10 });
  assert.deepEqual(applyDragonPointGrant(50, 30), { newPoints: 50, overflow: 30 });
  assert.deepEqual(applyDragonPointGrant(50, 0), { newPoints: 50, overflow: 0 });
});

test("canBuyDragonEgg checks egg price boundary", () => {
  assert.equal(canBuyDragonEgg(0), false);
  assert.equal(canBuyDragonEgg(199), false);
  assert.equal(canBuyDragonEgg(200), true);
  assert.equal(canBuyDragonEgg(201), true);
});

test("negative or non-integer inputs throw", () => {
  for (const bad of [-1, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => getDragonGrowthState(bad), RangeError);
    assert.throws(() => applyDragonPointGrant(bad, 10), RangeError);
    assert.throws(() => applyDragonPointGrant(10, bad), RangeError);
    assert.throws(() => canBuyDragonEgg(bad), RangeError);
  }
});
