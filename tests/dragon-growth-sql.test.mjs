import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DRAGON_GROWTH_THRESHOLDS, MAX_DRAGON_POINTS } from "../lib/dragon-growth.ts";

const MIGRATION_PATH = path.resolve("supabase/migrations/20261126050000_dragon_points.sql");
const PARTNER_EGG_MIGRATION_PATH = path.resolve("supabase/migrations/20261126060000_dragon_partner_egg.sql");

test("SQL dragon_points_cap and dragon_growth_thresholds match lib/dragon-growth.ts", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  const capMatch = sql.match(/CREATE FUNCTION public\.dragon_points_cap\(\)[\s\S]*?SELECT\s+(\d+)\s*;/);
  assert.ok(capMatch, "Expected dragon_points_cap() SELECT <int> in migration");
  assert.equal(Number(capMatch[1]), MAX_DRAGON_POINTS);

  const checkMatch = sql.match(/points\s+integer\s+NOT\s+NULL\s+DEFAULT\s+0\s+CHECK\s*\(points\s*>=\s*0\s+AND\s+points\s*<=\s*(\d+)\)/);
  assert.ok(checkMatch, "Expected dragons.points upper-bound CHECK in migration");
  assert.equal(Number(checkMatch[1]), MAX_DRAGON_POINTS);

  const thresholdsMatch = sql.match(
    /CREATE FUNCTION public\.dragon_growth_thresholds\(\)[\s\S]*?SELECT\s+(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*;/
  );
  assert.ok(thresholdsMatch, "Expected dragon_growth_thresholds() 8-column SELECT in migration");
  const nums = thresholdsMatch.slice(1, 9).map(Number);

  assert.deepEqual(nums, [
    DRAGON_GROWTH_THRESHOLDS.hatch,
    DRAGON_GROWTH_THRESHOLDS.adult,
    ...DRAGON_GROWTH_THRESHOLDS.levels,
    DRAGON_GROWTH_THRESHOLDS.eggPrice,
  ]);
});

test("SQL dragon_egg_price in 20261126060000_dragon_partner_egg.sql matches lib/dragon-growth.ts", () => {
  const sql = fs.readFileSync(PARTNER_EGG_MIGRATION_PATH, "utf8");
  const match = sql.match(/CREATE FUNCTION public\.dragon_egg_price\(\)[\s\S]*?SELECT\s+(\d+)\s*;/);
  assert.ok(match, "Expected dragon_egg_price() SELECT <int> in migration");
  assert.equal(Number(match[1]), DRAGON_GROWTH_THRESHOLDS.eggPrice);
});
