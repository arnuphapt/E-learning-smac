-- Dragon Species, Dragons, Wallets, Point Grants, Hub Members, and End-of-Session Grant RPC.
-- Written for Dice to run manually in the Supabase SQL Editor (dev first). Do not run via CLI/MCP without confirmation.
--
-- Rarity weights (S001-S003): Common = 10, Uncommon = 6, Rare = 3.
-- Thresholds match lib/dragon-growth.ts: hatch 1000, adult 5000, levels 1-5 at 10000/20000/35000/55000/80000, eggPrice 20000.

BEGIN;

-- ===========================================================================
-- 1. Growth Threshold Constants (keep in sync with lib/dragon-growth.ts)
-- ===========================================================================

CREATE FUNCTION public.dragon_points_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT 80000;
$fn$;

CREATE FUNCTION public.dragon_growth_thresholds()
RETURNS TABLE (
  hatch_at integer,
  adult_at integer,
  lvl1_at integer,
  lvl2_at integer,
  lvl3_at integer,
  lvl4_at integer,
  lvl5_at integer,
  egg_price integer
)
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT 1000, 5000, 10000, 20000, 35000, 55000, 80000, 20000;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_points_cap(), public.dragon_growth_thresholds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_points_cap(), public.dragon_growth_thresholds() TO authenticated, service_role;

-- ===========================================================================
-- 2. Tables & Seed
-- ===========================================================================

CREATE TABLE public.dragon_species (
  id     text PRIMARY KEY,
  rarity text NOT NULL,
  weight integer NOT NULL CHECK (weight > 0)
);

INSERT INTO public.dragon_species (id, rarity, weight) VALUES
  ('001', 'Common', 10),
  ('002', 'Common', 10),
  ('003', 'Uncommon', 6),
  ('004', 'Uncommon', 6),
  ('005', 'Common', 10),
  ('006', 'Uncommon', 6),
  ('007', 'Common', 10),
  ('008', 'Rare', 3),
  ('009', 'Common', 10),
  ('010', 'Uncommon', 6),
  ('011', 'Rare', 3)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.dragons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  species_id text NOT NULL REFERENCES public.dragon_species(id),
  points     integer NOT NULL DEFAULT 0 CHECK (points >= 0 AND points <= 80000),
  is_partner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dragons_user_id_idx ON public.dragons (user_id, created_at DESC);
CREATE UNIQUE INDEX dragons_one_partner_per_user_key ON public.dragons (user_id) WHERE is_partner IS TRUE;

CREATE TABLE public.dragon_wallets (
  user_id    text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance    integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime   integer NOT NULL DEFAULT 0 CHECK (lifetime >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dragon_point_grants (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points     integer NOT NULL CHECK (points >= 0),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE public.live_hub_members (
  hub_id          uuid NOT NULL REFERENCES public.live_hubs(id) ON DELETE CASCADE,
  user_id         text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_played_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hub_id, user_id)
);
CREATE INDEX live_hub_members_user_id_idx ON public.live_hub_members (user_id);

-- ===========================================================================
-- 3. Row Level Security & Grants (client read-only; writes via SECURITY DEFINER)
-- ===========================================================================

ALTER TABLE public.dragon_species      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragon_wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragon_point_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_hub_members    ENABLE ROW LEVEL SECURITY;

CREATE POLICY dragon_species_select ON public.dragon_species
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY dragons_select_own ON public.dragons
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_user_id()));

CREATE POLICY dragon_wallets_select_own ON public.dragon_wallets
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_user_id()));

CREATE POLICY dragon_point_grants_select_own ON public.dragon_point_grants
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_user_id()));

CREATE POLICY live_hub_members_select ON public.live_hub_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT public.current_user_id())
    OR EXISTS (
      SELECT 1 FROM public.live_hubs h
      WHERE h.id = live_hub_members.hub_id
        AND h.host_id = (SELECT public.current_user_id())
    )
  );

REVOKE ALL ON
  public.dragon_species,
  public.dragons,
  public.dragon_wallets,
  public.dragon_point_grants,
  public.live_hub_members
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON
  public.dragon_species,
  public.dragons,
  public.dragon_wallets,
  public.dragon_point_grants,
  public.live_hub_members
TO authenticated;

GRANT ALL ON
  public.dragon_species,
  public.dragons,
  public.dragon_wallets,
  public.dragon_point_grants,
  public.live_hub_members
TO service_role;

-- ===========================================================================
-- 4. Grant Helpers & live_session_end
-- ===========================================================================

CREATE FUNCTION public.dragon_pick_weighted_species()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  WITH weighted AS (
    SELECT
      id,
      sum(weight) OVER (ORDER BY id) AS cum_weight,
      sum(weight) OVER () AS total_weight
    FROM public.dragon_species
  ),
  roll AS (
    SELECT random() * max(total_weight) AS target FROM weighted
  )
  SELECT w.id
  FROM weighted w, roll r
  WHERE w.cum_weight >= r.target
  ORDER BY w.cum_weight
  LIMIT 1;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_pick_weighted_species() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_pick_weighted_species() TO service_role;

CREATE FUNCTION public.dragon_grant_session(p_session uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_hub_id uuid;
  v_cap integer := public.dragon_points_cap();
  v_grant record;
  v_has_dragon boolean;
  v_dragon_id uuid;
  v_dragon_points integer;
  v_new_points integer;
  v_overflow integer;
BEGIN
  SELECT hub_id INTO v_hub_id
  FROM public.live_sessions
  WHERE id = p_session;

  FOR v_grant IN (
    WITH player_totals AS (
      SELECT
        p.user_id,
        COALESCE(SUM(a.points), 0)::integer AS total_points
      FROM public.live_players p
      LEFT JOIN public.live_answers a
        ON a.session_id = p.session_id
       AND a.user_id = p.user_id
      WHERE p.session_id = p_session
      GROUP BY p.user_id
    ),
    granted AS (
      INSERT INTO public.dragon_point_grants (session_id, user_id, points)
      SELECT p_session, user_id, total_points
      FROM player_totals
      ON CONFLICT (session_id, user_id) DO NOTHING
      RETURNING user_id, points
    )
    SELECT user_id, points FROM granted
  ) LOOP
    INSERT INTO public.dragon_wallets (user_id, balance, lifetime)
    VALUES (v_grant.user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT EXISTS (
      SELECT 1 FROM public.dragons WHERE user_id = v_grant.user_id
    ) INTO v_has_dragon;

    IF NOT v_has_dragon THEN
      INSERT INTO public.dragons (user_id, species_id, points, is_partner)
      VALUES (v_grant.user_id, public.dragon_pick_weighted_species(), 0, true);
    END IF;

    SELECT id, points INTO v_dragon_id, v_dragon_points
    FROM public.dragons
    WHERE user_id = v_grant.user_id
      AND points < v_cap
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      v_new_points := LEAST(v_cap, v_dragon_points + v_grant.points);
      v_overflow := (v_dragon_points + v_grant.points) - v_new_points;
      UPDATE public.dragons
      SET points = v_new_points
      WHERE id = v_dragon_id;
    ELSE
      v_overflow := v_grant.points;
    END IF;

    UPDATE public.dragon_wallets
    SET balance = balance + v_overflow,
        lifetime = lifetime + v_grant.points,
        updated_at = now()
    WHERE user_id = v_grant.user_id;

    IF v_hub_id IS NOT NULL THEN
      INSERT INTO public.live_hub_members (hub_id, user_id)
      VALUES (v_hub_id, v_grant.user_id)
      ON CONFLICT (hub_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_grant_session(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_grant_session(uuid) TO service_role;

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
        COALESCE(SUM(least(COALESCE(a.points, 0), 1000)), 0)::numeric AS player_total
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
