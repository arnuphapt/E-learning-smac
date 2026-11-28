import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DRAGON_GROWTH_THRESHOLDS, MAX_DRAGON_POINTS } from "../lib/dragon-growth.ts";

const SCALE_DOWN_MIGRATION_PATH = path.resolve("supabase/migrations/20261128000000_points_scale_down.sql");

test("SQL 20261128000000_points_scale_down.sql matches lib/dragon-growth.ts", () => {
  const sql = fs.readFileSync(SCALE_DOWN_MIGRATION_PATH, "utf8");

  const capMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.dragon_points_cap\(\)[\s\S]*?SELECT\s+(\d+)\s*;/);
  assert.ok(capMatch, "Expected dragon_points_cap() SELECT <int> in scale-down migration");
  assert.equal(Number(capMatch[1]), MAX_DRAGON_POINTS);

  const checkMatch = sql.match(/ALTER TABLE public\.dragons\s+ADD CONSTRAINT dragons_points_check CHECK \(points >= 0 AND points <= (\d+)\)/);
  assert.ok(checkMatch, "Expected dragons.points upper-bound CHECK in scale-down migration");
  assert.equal(Number(checkMatch[1]), MAX_DRAGON_POINTS);

  const thresholdsMatch = sql.match(
    /CREATE FUNCTION public\.dragon_growth_thresholds\(\)[\s\S]*?SELECT\s+(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*;/,
  );
  assert.ok(thresholdsMatch, "Expected 3-column dragon_growth_thresholds() in scale-down migration");
  assert.deepEqual(thresholdsMatch.slice(1, 4).map(Number), [
    DRAGON_GROWTH_THRESHOLDS.hatch,
    DRAGON_GROWTH_THRESHOLDS.adult,
    DRAGON_GROWTH_THRESHOLDS.eggPrice,
  ]);

  const eggPriceMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.dragon_egg_price\(\)[\s\S]*?SELECT\s+(\d+)\s*;/);
  assert.ok(eggPriceMatch, "Expected dragon_egg_price() SELECT <int> in scale-down migration");
  assert.equal(Number(eggPriceMatch[1]), DRAGON_GROWTH_THRESHOLDS.eggPrice);

  assert.match(sql, /ALTER TABLE public\.live_quiz_questions[\s\S]*?SET DEFAULT 10[\s\S]*?CHECK \(points BETWEEN 1 AND 50\)/);
  assert.match(sql, /ALTER TABLE public\.live_session_questions[\s\S]*?SET DEFAULT 10[\s\S]*?CHECK \(points BETWEEN 1 AND 50\)/);
  assert.match(sql, /ALTER TABLE public\.live_answers[\s\S]*?CHECK \(points >= 0 AND points <= 50\)/);
  assert.match(sql, /least\(COALESCE\(a\.points, 0\), 10\)/);
});
