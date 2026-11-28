-- Dragon hatch rules:
-- 1. dragons.hatched_at (nullable timestamptz; NULL = unhatched egg).
--    Backfill existing dragons whose points already reach hatch_at (1000).
-- 2. dragon_grant_first_egg(p_user): grant one egg on first live-room join,
--    serialized with the per-owner advisory lock.
-- 3. dragon_grant_session(p_session): CREATE OR REPLACE from 20261126070000.
--    Still creates first egg if missing (legacy joins), records first_egg truthfully,
--    and accrues points to the unhatched egg up to the level-5 cap (80000).
-- 4. dragon_buy_egg(p_user): CREATE OR REPLACE; reject with P0002 / 'incubator_occupied'
--    when the owner already has an unhatched egg (hatched_at IS NULL).
-- 5. dragon_hatch(p_user, p_dragon): SECURITY DEFINER (service_role only); hatch an
--    owned unhatched egg once points >= hatch_at (1000), idempotent on repeat/concurrent calls.
-- 6. dragon_hub_scene(p_hub, p_limit): CREATE OR REPLACE; include hatched_at per dragon.

BEGIN;

-- ===========================================================================
-- 1. dragons.hatched_at + backfill for existing dragons >= hatch threshold
-- ===========================================================================

ALTER TABLE public.dragons
  ADD COLUMN hatched_at timestamptz;

UPDATE public.dragons
SET hatched_at = now()
WHERE hatched_at IS NULL
  AND points >= (SELECT hatch_at FROM public.dragon_growth_thresholds());

-- ===========================================================================
-- 2. dragon_grant_first_egg: first-join egg grant (per-owner locked)
-- ===========================================================================

CREATE FUNCTION public.dragon_grant_first_egg(p_user text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_has_dragon boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dragon_owner:' || p_user));

  SELECT EXISTS (
    SELECT 1 FROM public.dragons WHERE user_id = p_user
  ) INTO v_has_dragon;

  IF v_has_dragon THEN
    RETURN false;
  END IF;

  INSERT INTO public.dragon_wallets (user_id, balance, lifetime)
  VALUES (p_user, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.dragons (user_id, species_id, points, is_partner)
  VALUES (p_user, public.dragon_pick_weighted_species(), 0, true);

  RETURN true;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_grant_first_egg(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_grant_first_egg(text) TO service_role;

-- ===========================================================================
-- 3. dragon_grant_session: keep legacy first-egg fallback + accrue past hatch
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
-- 4. dragon_buy_egg: require empty incubator (no hatched_at IS NULL)
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

  IF EXISTS (
    SELECT 1
    FROM public.dragons
    WHERE user_id = p_user
      AND hatched_at IS NULL
  ) THEN
    RAISE EXCEPTION 'incubator_occupied' USING ERRCODE = 'P0002';
  END IF;

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
-- 5. dragon_hatch: explicit owner-triggered hatch (idempotent)
-- ===========================================================================

CREATE FUNCTION public.dragon_hatch(p_user text, p_dragon uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_hatch_at integer := (SELECT hatch_at FROM public.dragon_growth_thresholds());
  v_dragon record;
  v_hatched_at timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dragon_owner:' || p_user));

  SELECT id, points, hatched_at
  INTO v_dragon
  FROM public.dragons
  WHERE id = p_dragon
    AND user_id = p_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dragon_not_found' USING ERRCODE = 'P0003';
  END IF;

  IF v_dragon.hatched_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'id', v_dragon.id,
      'hatched_at', v_dragon.hatched_at,
      'points', v_dragon.points
    );
  END IF;

  IF v_dragon.points < v_hatch_at THEN
    RAISE EXCEPTION 'hatch_threshold_not_met' USING ERRCODE = 'P0004';
  END IF;

  UPDATE public.dragons
  SET hatched_at = now()
  WHERE id = p_dragon
  RETURNING hatched_at INTO v_hatched_at;

  RETURN jsonb_build_object(
    'id', v_dragon.id,
    'hatched_at', v_hatched_at,
    'points', v_dragon.points
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_hatch(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_hatch(text, uuid) TO service_role;

-- ===========================================================================
-- 6. dragon_hub_scene: include hatched_at per dragon
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.dragon_hub_scene(p_hub uuid, p_limit integer DEFAULT 40)
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
    SELECT d.species_id, d.points, d.hatched_at, lp.last_at, lp.user_id
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
         jsonb_build_object(
           'species_id', t.species_id,
           'points', t.points,
           'hatched_at', t.hatched_at
         )
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
