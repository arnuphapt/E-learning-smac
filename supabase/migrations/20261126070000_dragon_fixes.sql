-- Dragon hub review fixes (follow-up to 20261126050000 / 20261126060000, which are already applied and must not be edited).
-- Written for Dice to confirm; apply manually (dev first). Do not run via CLI/MCP without confirmation.
--
-- 1. dragon_grant_session: process players ordered by user_id and take a per-owner advisory lock,
--    so two rooms sharing students cannot deadlock (A->B vs B->A).
-- 2. dragon_set_partner / dragon_buy_egg: take the same per-owner advisory lock first, so partner
--    changes and egg purchases of one owner are serialized (no unique-partner violation -> 500).
-- 3. dragon_point_grants: persist the real grant outcome (dragon, points before/after, overflow,
--    first egg). Nullable: rows written before this migration stay NULL (no stage-change claim).
-- 4. dragon_hub_scene: DB-side "latest play" ordering + LIMIT for the hub dragon scene.
--
-- No DROP statements: only CREATE OR REPLACE FUNCTION, ADD COLUMN and CREATE FUNCTION.
-- Lock order everywhere: advisory owner lock -> wallet row -> dragon rows.

BEGIN;

-- ===========================================================================
-- 1. Persisted grant outcome (all nullable for legacy rows)
-- ===========================================================================

ALTER TABLE public.dragon_point_grants
  ADD COLUMN dragon_id     uuid REFERENCES public.dragons(id) ON DELETE SET NULL,
  ADD COLUMN points_before integer CHECK (points_before >= 0),
  ADD COLUMN points_after  integer CHECK (points_after >= 0),
  ADD COLUMN overflow      integer CHECK (overflow >= 0),
  ADD COLUMN first_egg     boolean;

-- ===========================================================================
-- 2. dragon_grant_session: ordered, locked, outcome-recording
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.dragon_grant_session(p_session uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_hub_id uuid;
  v_cap integer := public.dragon_points_cap();
  v_player record;
  v_has_dragon boolean;
  v_dragon_id uuid;
  v_dragon_points integer;
  v_new_points integer;
  v_overflow integer;
BEGIN
  SELECT hub_id INTO v_hub_id
  FROM public.live_sessions
  WHERE id = p_session;

  FOR v_player IN (
    SELECT
      p.user_id,
      COALESCE(SUM(a.points), 0)::integer AS total_points
    FROM public.live_players p
    LEFT JOIN public.live_answers a
      ON a.session_id = p.session_id
     AND a.user_id = p.user_id
    WHERE p.session_id = p_session
    GROUP BY p.user_id
    ORDER BY p.user_id
  ) LOOP
    PERFORM pg_advisory_xact_lock(hashtext('dragon_owner:' || v_player.user_id));

    INSERT INTO public.dragon_point_grants (session_id, user_id, points)
    VALUES (p_session, v_player.user_id, v_player.total_points)
    ON CONFLICT (session_id, user_id) DO NOTHING;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.dragon_wallets (user_id, balance, lifetime)
    VALUES (v_player.user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT EXISTS (
      SELECT 1 FROM public.dragons WHERE user_id = v_player.user_id
    ) INTO v_has_dragon;

    IF NOT v_has_dragon THEN
      INSERT INTO public.dragons (user_id, species_id, points, is_partner)
      VALUES (v_player.user_id, public.dragon_pick_weighted_species(), 0, true);
    END IF;

    v_dragon_id := NULL;
    v_new_points := NULL;
    v_dragon_points := NULL;

    SELECT id, points INTO v_dragon_id, v_dragon_points
    FROM public.dragons
    WHERE user_id = v_player.user_id
      AND points < v_cap
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      v_new_points := LEAST(v_cap, v_dragon_points + v_player.total_points);
      v_overflow := (v_dragon_points + v_player.total_points) - v_new_points;
      UPDATE public.dragons
      SET points = v_new_points
      WHERE id = v_dragon_id;
    ELSE
      v_dragon_id := NULL;
      v_dragon_points := NULL;
      v_overflow := v_player.total_points;
    END IF;

    UPDATE public.dragon_wallets
    SET balance = balance + v_overflow,
        lifetime = lifetime + v_player.total_points,
        updated_at = now()
    WHERE user_id = v_player.user_id;

    UPDATE public.dragon_point_grants
    SET dragon_id = v_dragon_id,
        points_before = v_dragon_points,
        points_after = v_new_points,
        overflow = v_overflow,
        first_egg = NOT v_has_dragon
    WHERE session_id = p_session
      AND user_id = v_player.user_id;

    IF v_hub_id IS NOT NULL THEN
      INSERT INTO public.live_hub_members (hub_id, user_id)
      VALUES (v_hub_id, v_player.user_id)
      ON CONFLICT (hub_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_grant_session(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_grant_session(uuid) TO service_role;

-- ===========================================================================
-- 3. dragon_set_partner: per-owner serialization
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.dragon_set_partner(p_user text, p_dragon uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dragon_owner:' || p_user));

  PERFORM 1
  FROM public.dragons
  WHERE id = p_dragon
    AND user_id = p_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Clear the previous partner before promoting the new one so
  -- dragons_one_partner_per_user_key never sees two active partners.
  UPDATE public.dragons
  SET is_partner = false
  WHERE user_id = p_user
    AND is_partner IS TRUE
    AND id <> p_dragon;

  UPDATE public.dragons
  SET is_partner = true
  WHERE id = p_dragon
    AND user_id = p_user
    AND is_partner IS FALSE;

  RETURN 'ok';
END;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_set_partner(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_set_partner(text, uuid) TO service_role;

-- ===========================================================================
-- 4. dragon_buy_egg: same per-owner lock before reading/setting partner
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.dragon_buy_egg(p_user text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_price integer := public.dragon_egg_price();
  v_balance integer;
  v_has_partner boolean;
  v_dragon_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dragon_owner:' || p_user));

  SELECT balance INTO v_balance
  FROM public.dragon_wallets
  WHERE user_id = p_user
  FOR UPDATE;

  IF NOT FOUND OR v_balance < v_price THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.dragon_wallets
  SET balance = balance - v_price,
      updated_at = now()
  WHERE user_id = p_user;

  SELECT EXISTS (
    SELECT 1
    FROM public.dragons
    WHERE user_id = p_user
      AND is_partner IS TRUE
  ) INTO v_has_partner;

  INSERT INTO public.dragons (user_id, species_id, points, is_partner)
  VALUES (p_user, public.dragon_pick_weighted_species(), 0, NOT v_has_partner)
  RETURNING id INTO v_dragon_id;

  RETURN v_dragon_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_buy_egg(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_buy_egg(text) TO service_role;

-- ===========================================================================
-- 5. dragon_hub_scene: partner dragons of a hub, newest play first, LIMIT in SQL
-- ===========================================================================
-- Authorization (hub owner or member) stays in lib/hub-dragons.ts; execute is service_role only.
-- Returns {"total_members": n, "dragons": [{"species_id": "...", "points": n}, ...]}.

CREATE FUNCTION public.dragon_hub_scene(p_hub uuid, p_limit integer DEFAULT 40)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  WITH last_play AS (
    SELECT
      m.user_id,
      GREATEST(m.first_played_at, COALESCE(max(g.granted_at), m.first_played_at)) AS last_at
    FROM public.live_hub_members m
    LEFT JOIN public.live_sessions s ON s.hub_id = m.hub_id
    LEFT JOIN public.dragon_point_grants g
      ON g.session_id = s.id
     AND g.user_id = m.user_id
    WHERE m.hub_id = p_hub
    GROUP BY m.user_id, m.first_played_at
  ),
  picked AS (
    SELECT d.species_id, d.points, lp.last_at, lp.user_id
    FROM last_play lp
    JOIN public.dragons d
      ON d.user_id = lp.user_id
     AND d.is_partner IS TRUE
    ORDER BY lp.last_at DESC, lp.user_id
    LIMIT GREATEST(p_limit, 0)
  )
  SELECT jsonb_build_object(
    'total_members', (SELECT count(*) FROM public.live_hub_members WHERE hub_id = p_hub),
    'dragons', COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object('species_id', t.species_id, 'points', t.points)
         ORDER BY t.last_at DESC, t.user_id
       ) FROM picked t),
      '[]'::jsonb
    )
  );
$fn$;

REVOKE ALL ON FUNCTION public.dragon_hub_scene(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_hub_scene(uuid, integer) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
