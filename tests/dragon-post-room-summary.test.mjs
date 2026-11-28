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
    points: 5,
    pointsBefore: 7,
    pointsAfter: 12,
    overflow: 0,
    firstEgg: false,
  });
  assert.equal(res.first_egg, false);
  assert.equal(res.before?.stage, "egg");
  assert.equal(res.after?.stage, "baby");
});

test("summarizeDragonPointGrant: crossing adult threshold (baby -> adult)", () => {
  const res = summarizeDragonPointGrant({
    points: 10,
    pointsBefore: 40,
    pointsAfter: 50,
    overflow: 0,
    firstEgg: false,
  });
  assert.equal(res.before?.stage, "baby");
  assert.equal(res.after?.stage, "adult");
  assert.equal(res.after?.nextAt, null);
});

test("summarizeDragonPointGrant: hitting the cap reports persisted overflow", () => {
  const res = summarizeDragonPointGrant({
    points: 55,
    pointsBefore: 0,
    pointsAfter: 50,
    overflow: 5,
    firstEgg: true,
  });
  assert.equal(res.after?.stage, "adult");
  assert.equal(res.after?.nextAt, null);
  assert.equal(res.overflow, 5);
});

test("summarizeDragonPointGrant: already-maxed dragon claims no stage change", () => {
  const res = summarizeDragonPointGrant({
    points: 10,
    pointsBefore: null,
    pointsAfter: null,
    overflow: 10,
    firstEgg: false,
  });
  assert.equal(res.before, null);
  assert.equal(res.after, null);
  assert.equal(res.overflow, 10);
});

test("summarizeDragonPointGrant: legacy row (all nulls) gives points only", () => {
  const res = summarizeDragonPointGrant({
    points: 4,
    pointsBefore: null,
    pointsAfter: null,
    overflow: null,
    firstEgg: null,
  });
  assert.equal(res.points, 4);
  assert.equal(res.before, null);
  assert.equal(res.after, null);
  assert.equal(res.first_egg, false);
  assert.equal(res.overflow, 0);
  assert.equal(res.message, null);
});

test("summarizeDragonPointGrant: unhatched egg reaching hatch threshold shows ready-to-hatch message", () => {
  const res = summarizeDragonPointGrant({
    points: 5,
    pointsBefore: 7,
    pointsAfter: 12,
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
    points: 2,
    pointsBefore: 7,
    pointsAfter: 9,
    overflow: 0,
    firstEgg: false,
    hatched: false,
  });
  assert.equal(res.after?.stage, "egg");
  assert.equal(res.after?.readyToHatch, false);
  assert.equal(res.message, null);
});
