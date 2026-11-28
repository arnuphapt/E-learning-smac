-- Scale quiz & dragon points down by ÷100 and make adult the final dragon stage.
-- Written for Dice to run manually in the Supabase SQL Editor (dev first). Do not run via CLI/MCP without confirmation.
--
-- What changed:
--   1. Question points: 100..5000 (step 100, default 1000) -> 1..50 (step 1, default 10)
--      on live_quiz_questions and live_session_questions.
--   2. live_answers.points CHECK: 0..5000 -> 0..50.
--   3. live_session_end: team XP cap per answer 1000 -> 10.
--   4. Dragon growth & economy:
--        - hatch_at: 1000 -> 10
--        - adult_at (and dragon_points_cap): 5000 / 80000 -> 50 (adult is final; no adult levels)
--        - egg_price: 20000 -> 200
--        - dragons.points CHECK: 0..80000 -> 0..50
--        - dragon_growth_thresholds() shape: (hatch_at integer, adult_at integer, egg_price integer)
--   5. Existing data: ÷100 with round() on live_quiz_questions, live_session_questions,
--      live_answers, live_team_results, dragon_wallets, dragon_point_grants, and dragons
--      (excess above 50 on dragons.points is credited to the owner's dragon_wallets.balance;
--      hatched_at is preserved).

BEGIN;

-- ===========================================================================
-- 1. Drop old CHECK constraints before scaling rows
-- ===========================================================================

ALTER TABLE public.live_quiz_questions DROP CONSTRAINT live_quiz_questions_points_check;
ALTER TABLE public.live_session_questions DROP CONSTRAINT live_session_questions_points_check;
ALTER TABLE public.live_answers DROP CONSTRAINT live_answers_points_check;
ALTER TABLE public.dragons DROP CONSTRAINT IF EXISTS dragons_points_check;

-- ===========================================================================
-- 2. Scale existing data (÷100 with round())
-- ===========================================================================

UPDATE public.live_quiz_questions
SET points = GREATEST(1, LEAST(50, round(points::numeric / 100)::integer));

UPDATE public.live_session_questions
SET points = GREATEST(1, LEAST(50, round(points::numeric / 100)::integer));

UPDATE public.live_answers
SET points = GREATEST(0, LEAST(50, round(points::numeric / 100)::integer));

UPDATE public.live_team_results
SET score = GREATEST(0, round(score::numeric / 100)::integer);

UPDATE public.dragon_wallets
SET balance = round(balance::numeric / 100)::integer,
    lifetime = round(lifetime::numeric / 100)::integer,
    updated_at = now();

WITH excess AS (
  SELECT
    user_id,
    SUM(GREATEST(0, round(points::numeric / 100)::integer - 50))::integer AS extra
  FROM public.dragons
  GROUP BY user_id
  HAVING SUM(GREATEST(0, round(points::numeric / 100)::integer - 50)) > 0
)
INSERT INTO public.dragon_wallets (user_id, balance, lifetime, updated_at)
SELECT user_id, extra, extra, now()
FROM excess
ON CONFLICT (user_id) DO UPDATE
SET balance = public.dragon_wallets.balance + EXCLUDED.balance,
    updated_at = now();

UPDATE public.dragons
SET points = LEAST(50, round(points::numeric / 100)::integer);

UPDATE public.dragon_point_grants
SET points = round(points::numeric / 100)::integer,
    points_before = CASE
      WHEN points_before IS NOT NULL THEN round(points_before::numeric / 100)::integer
      ELSE NULL
    END,
    points_after = CASE
      WHEN points_after IS NOT NULL THEN LEAST(50, round(points_after::numeric / 100)::integer)
      ELSE NULL
    END,
    overflow = round(overflow::numeric / 100)::integer;

-- ===========================================================================
-- 3. New defaults and CHECK constraints
-- ===========================================================================

ALTER TABLE public.live_quiz_questions
  ALTER COLUMN points SET DEFAULT 10,
  ADD CONSTRAINT live_quiz_questions_points_check CHECK (points BETWEEN 1 AND 50);

ALTER TABLE public.live_session_questions
  ALTER COLUMN points SET DEFAULT 10,
  ADD CONSTRAINT live_session_questions_points_check CHECK (points BETWEEN 1 AND 50);

ALTER TABLE public.live_answers
  ADD CONSTRAINT live_answers_points_check CHECK (points >= 0 AND points <= 50);

ALTER TABLE public.dragons
  ADD CONSTRAINT dragons_points_check CHECK (points >= 0 AND points <= 50);

-- ===========================================================================
-- 4. Functions (constants + live_session_end team XP cap)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.dragon_points_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT 50;
$fn$;

DROP FUNCTION public.dragon_growth_thresholds();

CREATE FUNCTION public.dragon_growth_thresholds()
RETURNS TABLE (
  hatch_at integer,
  adult_at integer,
  egg_price integer
)
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT 10, 50, 200;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_points_cap(), public.dragon_growth_thresholds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_points_cap(), public.dragon_growth_thresholds() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dragon_egg_price()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT 200;
$fn$;

-- Body copied from 20261126050000_dragon_points.sql with team XP per-answer cap 1000 -> 10.
CREATE OR REPLACE FUNCTION public.live_session_end(p_session uuid, p_expected_phase text, p_expected_index integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_team_mode boolean;
  v_current_index integer;
  v_phase text;
  v_ended_now boolean := false;
BEGIN
  SELECT phase, team_mode, current_index
  INTO v_phase, v_team_mode, v_current_index
  FROM public.live_sessions
  WHERE id = p_session
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'conflict';
  END IF;

  IF v_phase <> 'ended' THEN
    IF v_phase IS DISTINCT FROM p_expected_phase OR v_current_index IS DISTINCT FROM p_expected_index THEN
      RETURN 'conflict';
    END IF;
    UPDATE public.live_sessions
    SET phase = 'ended',
        ended_at = now()
    WHERE id = p_session;
    v_ended_now := true;
  END IF;

  -- คำนวณผลทีมเฉพาะเมื่อเปิดโหมดทีมและห้องเริ่มเล่นแล้วอย่างน้อย 1 ข้อ
  IF v_team_mode IS TRUE AND v_current_index >= 0 THEN
    WITH team_players AS (
      SELECT
        p.team_id,
        p.user_id,
        COALESCE(SUM(least(COALESCE(a.points, 0), 10)), 0)::numeric AS player_total
      FROM public.live_players p
      LEFT JOIN public.live_answers a
        ON a.session_id = p.session_id
       AND a.user_id = p.user_id
      WHERE p.session_id = p_session
        AND p.team_id IS NOT NULL
      GROUP BY p.team_id, p.user_id
    ),
    team_agg AS (
      SELECT
        team_id,
        round(avg(player_total))::integer AS score,
        count(*)::integer AS members
      FROM team_players
      GROUP BY team_id
    )
    INSERT INTO public.live_team_results (session_id, team_id, score, members)
    SELECT
      p_session,
      team_id,
      score,
      members
    FROM team_agg
    ON CONFLICT (session_id, team_id) DO NOTHING;
  END IF;

  IF v_ended_now THEN
    PERFORM public.dragon_grant_session(p_session);
  END IF;

  RETURN 'ok';
END;
$fn$;

REVOKE ALL ON FUNCTION public.live_session_end(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_session_end(uuid, text, integer) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (×100 and restore old constraints/functions). Run top to bottom.
-- NOTE (lossy): Rounding (ROUND(... / 100.0)) and the 50-point adult cap
-- (overflow moved into dragon_wallets.balance/lifetime) are NOT exactly
-- reversible by multiplying by 100. Restoring exact pre-migration point
-- allocations requires a pre-migration snapshot/backup.
-- ===========================================================================
-- BEGIN;
-- ALTER TABLE public.live_quiz_questions DROP CONSTRAINT live_quiz_questions_points_check;
-- ALTER TABLE public.live_session_questions DROP CONSTRAINT live_session_questions_points_check;
-- ALTER TABLE public.live_answers DROP CONSTRAINT live_answers_points_check;
-- ALTER TABLE public.dragons DROP CONSTRAINT IF EXISTS dragons_points_check;
--
-- UPDATE public.live_quiz_questions SET points = points * 100;
-- UPDATE public.live_session_questions SET points = points * 100;
-- UPDATE public.live_answers SET points = points * 100;
-- UPDATE public.live_team_results SET score = score * 100;
-- UPDATE public.dragons SET points = points * 100;
-- UPDATE public.dragon_wallets SET balance = balance * 100, lifetime = lifetime * 100, updated_at = now();
-- UPDATE public.dragon_point_grants
-- SET points = points * 100,
--     points_before = CASE WHEN points_before IS NOT NULL THEN points_before * 100 ELSE NULL END,
--     points_after = CASE WHEN points_after IS NOT NULL THEN points_after * 100 ELSE NULL END,
--     overflow = overflow * 100;
--
-- ALTER TABLE public.live_quiz_questions
--   ALTER COLUMN points SET DEFAULT 1000,
--   ADD CONSTRAINT live_quiz_questions_points_check CHECK (points BETWEEN 100 AND 5000 AND points % 100 = 0);
-- ALTER TABLE public.live_session_questions
--   ALTER COLUMN points SET DEFAULT 1000,
--   ADD CONSTRAINT live_session_questions_points_check CHECK (points BETWEEN 100 AND 5000 AND points % 100 = 0);
-- ALTER TABLE public.live_answers
--   ADD CONSTRAINT live_answers_points_check CHECK (points >= 0 AND points <= 5000);
-- ALTER TABLE public.dragons
--   ADD CONSTRAINT dragons_points_check CHECK (points >= 0 AND points <= 80000);
--
-- CREATE OR REPLACE FUNCTION public.dragon_points_cap() RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$ SELECT 80000; $fn$;
-- DROP FUNCTION public.dragon_growth_thresholds();
-- CREATE FUNCTION public.dragon_growth_thresholds()
-- RETURNS TABLE (hatch_at integer, adult_at integer, lvl1_at integer, lvl2_at integer, lvl3_at integer, lvl4_at integer, lvl5_at integer, egg_price integer)
-- LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$ SELECT 1000, 5000, 10000, 20000, 35000, 55000, 80000, 20000; $fn$;
-- REVOKE ALL ON FUNCTION public.dragon_points_cap(), public.dragon_growth_thresholds() FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.dragon_points_cap(), public.dragon_growth_thresholds() TO authenticated, service_role;
-- CREATE OR REPLACE FUNCTION public.dragon_egg_price() RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$ SELECT 20000; $fn$;
-- (re-run live_session_end from 20261126050000_dragon_points.sql with cap 1000)
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
