import { test } from "node:test";
import assert from "node:assert/strict";
import { compareThai, getPageNumbers, matchesSearch } from "../components/common/data-table/helpers.ts";

test("matchesSearch uses searchKeys, ignores objects, is case-insensitive", () => {
  const row = { name: "Somchai", code: "A01", meta: { x: "hit" } };
  assert.equal(matchesSearch(row, "SOM", ["name"]), true);
  assert.equal(matchesSearch(row, "a01", ["name"]), false);
  assert.equal(matchesSearch(row, "a01"), true);
  assert.equal(matchesSearch(row, "hit"), false);
  assert.equal(matchesSearch(row, "  "), true);
});

test("compareThai sorts numbers numerically, text in Thai order, null first", () => {
  assert.ok(compareThai("2", 10) < 0);
  assert.ok(compareThai("ก", "ข") < 0);
  assert.ok(compareThai(null, "a") < 0);
  assert.equal(compareThai(5, 5), 0);
});

test("getPageNumbers keeps first, last, current +-1 with ellipsis", () => {
  assert.deepEqual(getPageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(getPageNumbers(5, 10), [1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  assert.deepEqual(getPageNumbers(1, 1), [1]);
});
