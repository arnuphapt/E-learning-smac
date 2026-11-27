import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDragonPointGrant } from "../lib/dragon-growth.ts";

test("summarizeDragonPointGrant: first egg with 0 points", () => {
  const res = summarizeDragonPointGrant({
    points: 0,
    pointsBefore: 0,
    pointsAfter: 0,
    overflow: 0,
    firstEgg: true,
  });
  assert.equal(res.points, 0);
  assert.equal(res.first_egg, true);
  assert.equal(res.overflow, 0);
  assert.equal(res.before?.stage, "egg");
  assert.equal(res.after?.stage, "egg");
});

test("summarizeDragonPointGrant: crossing hatch threshold (egg -> baby)", () => {
  const res = summarizeDragonPointGrant({
    points: 500,
    pointsBefore: 700,
    pointsAfter: 1_200,
    overflow: 0,
    firstEgg: false,
  });
  assert.equal(res.first_egg, false);
  assert.equal(res.before?.stage, "egg");
  assert.equal(res.after?.stage, "baby");
});

test("summarizeDragonPointGrant: crossing an adult level threshold", () => {
  const res = summarizeDragonPointGrant({
    points: 3_000,
    pointsBefore: 18_000,
    pointsAfter: 21_000,
    overflow: 0,
    firstEgg: false,
  });
  assert.equal(res.before?.level, 1);
  assert.equal(res.after?.level, 2);
});

test("summarizeDragonPointGrant: hitting the cap reports persisted overflow", () => {
  const res = summarizeDragonPointGrant({
    points: 85_000,
    pointsBefore: 0,
    pointsAfter: 80_000,
    overflow: 5_000,
    firstEgg: true,
  });
  assert.equal(res.after?.level, 5);
  assert.equal(res.after?.nextAt, null);
  assert.equal(res.overflow, 5_000);
});

test("summarizeDragonPointGrant: already-maxed dragon claims no stage change", () => {
  const res = summarizeDragonPointGrant({
    points: 1_000,
    pointsBefore: null,
    pointsAfter: null,
    overflow: 1_000,
    firstEgg: false,
  });
  assert.equal(res.before, null);
  assert.equal(res.after, null);
  assert.equal(res.overflow, 1_000);
});

test("summarizeDragonPointGrant: legacy row (all nulls) gives points only", () => {
  const res = summarizeDragonPointGrant({
    points: 400,
    pointsBefore: null,
    pointsAfter: null,
    overflow: null,
    firstEgg: null,
  });
  assert.equal(res.points, 400);
  assert.equal(res.before, null);
  assert.equal(res.after, null);
  assert.equal(res.first_egg, false);
  assert.equal(res.overflow, 0);
  assert.equal(res.message, null);
});

test("summarizeDragonPointGrant: unhatched egg reaching hatch threshold shows ready-to-hatch message", () => {
  const res = summarizeDragonPointGrant({
    points: 500,
    pointsBefore: 700,
    pointsAfter: 1_200,
    overflow: 0,
    firstEgg: false,
    hatched: false,
  });
  assert.equal(res.before?.stage, "egg");
  assert.equal(res.after?.stage, "egg");
  assert.equal(res.after?.readyToHatch, true);
  assert.equal(res.message, "ไข่พร้อมฟักแล้ว ไปกดฟักที่หน้ามังกร");
});

test("summarizeDragonPointGrant: unhatched egg below hatch threshold does not show ready-to-hatch message", () => {
  const res = summarizeDragonPointGrant({
    points: 200,
    pointsBefore: 700,
    pointsAfter: 900,
    overflow: 0,
    firstEgg: false,
    hatched: false,
  });
  assert.equal(res.after?.stage, "egg");
  assert.equal(res.after?.readyToHatch, false);
  assert.equal(res.message, null);
});
