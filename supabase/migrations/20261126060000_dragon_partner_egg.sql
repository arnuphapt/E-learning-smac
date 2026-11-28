-- Partner selection and egg purchase RPCs for personal dragon hub.
-- Written for Dice to apply manually (dev first). Do not run via CLI/MCP without confirmation.
--
-- Egg price matches lib/dragon-growth.ts (eggPrice = 20000).

BEGIN;

-- ===========================================================================
-- 1. Egg Price Constant (keep in sync with lib/dragon-growth.ts)
-- ===========================================================================

CREATE FUNCTION public.dragon_egg_price()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT 20000;
$fn$;

REVOKE ALL ON FUNCTION public.dragon_egg_price() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_egg_price() TO authenticated, service_role;

-- ===========================================================================
-- 2. Partner Dragon Selection
-- ===========================================================================

CREATE FUNCTION public.dragon_set_partner(p_user text, p_dragon uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
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
-- 3. Atomic Egg Purchase
-- ===========================================================================

CREATE FUNCTION public.dragon_buy_egg(p_user text)
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

COMMIT;
