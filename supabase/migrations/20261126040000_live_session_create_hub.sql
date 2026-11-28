-- Require every new live quiz session to belong to an instructor-owned hub.
-- NOTE: Contains DROP FUNCTION to replace the 6-arg live_session_create with the 7-arg overload (avoids PostgREST ambiguity).
-- Written for Dice to run manually in the Supabase SQL Editor (dev first). Do not run via CLI/MCP without confirmation.

BEGIN;

DROP FUNCTION public.live_session_create(text, uuid, text, text, boolean, boolean);

CREATE FUNCTION public.live_session_create(
  p_host text,
  p_quiz uuid,
  p_course text,
  p_pin text,
  p_hub uuid,
  p_team_mode boolean DEFAULT false,
  p_restrict boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_title text;
  v_total integer;
  v_session_id uuid;
BEGIN
  PERFORM 1
  FROM public.live_hubs
  WHERE id = p_hub
    AND host_id = p_host;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hub % not found or not owned by %', p_hub, p_host;
  END IF;

  SELECT title INTO v_title
  FROM public.live_quizzes
  WHERE id = p_quiz;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz % not found', p_quiz;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.live_quiz_questions
  WHERE quiz_id = p_quiz;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Quiz % has no questions', p_quiz;
  END IF;

  INSERT INTO public.live_sessions (
    pin,
    host_id,
    quiz_id,
    title,
    total,
    course_id,
    hub_id,
    team_mode,
    restrict_to_course,
    phase,
    current_index
  ) VALUES (
    p_pin,
    p_host,
    p_quiz,
    v_title,
    v_total,
    p_course,
    p_hub,
    COALESCE(p_team_mode, false),
    COALESCE(p_restrict, true),
    'lobby',
    -1
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.live_session_questions (
    session_id,
    idx,
    text,
    choices,
    answer,
    time_limit_sec,
    points
  )
  SELECT
    v_session_id,
    (row_number() OVER (ORDER BY no)) - 1,
    text,
    choices,
    answer,
    time_limit_sec,
    points
  FROM public.live_quiz_questions
  WHERE quiz_id = p_quiz
  ORDER BY no;

  RETURN v_session_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.live_session_create(text, uuid, text, text, uuid, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_session_create(text, uuid, text, text, uuid, boolean, boolean) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
