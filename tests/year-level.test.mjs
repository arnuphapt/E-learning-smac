import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesYearLevel } from "../lib/year-level.ts";

test("no restriction is open to everyone", () => {
  assert.equal(matchesYearLevel(null, 2, null), true);
  assert.equal(matchesYearLevel(undefined, null, null), true);
  assert.equal(matchesYearLevel([], 3, "ชั้นปีที่ 3"), true);
});

test("numeric entries match the study year (numbers and numeric strings)", () => {
  assert.equal(matchesYearLevel([1, 2], 2, null), true);
  assert.equal(matchesYearLevel([1, 2], 4, null), false);
  assert.equal(matchesYearLevel(["3"], 3, null), true);
  assert.equal(matchesYearLevel([2], null, null), false);
});

test("non-numeric entries match the year label", () => {
  assert.equal(matchesYearLevel(["ชั้นปีที่ 4"], 4, "ชั้นปีที่ 4"), true);
  assert.equal(matchesYearLevel(["ชั้นปีที่ 4"], 4, "ชั้นปีที่ 1"), false);
  assert.equal(matchesYearLevel(["ชั้นปีที่ 4"], 4, null), false);
});
