-- Live Quiz per-question points, ticket 05.
-- Written for Dice to run manually in the Supabase SQL Editor. Do not run via CLI/MCP.
--
-- What it does:
--   1. Adds `points integer NOT NULL DEFAULT 1000` to live_quiz_questions and live_session_questions,
--      with CHECK (points BETWEEN 100 AND 5000 AND points % 100 = 0).
--      Existing rows get 1000 from the default, so existing quizzes behave as before.
--   2. live_answers_points_check is dropped and re-created as (points >= 0 AND points <= 5000).
--      This is the ONLY DROP in the forward migration (a constraint, not data; re-created in the same transaction).
--   3. CREATE OR REPLACE of three RPCs (signatures, SECURITY DEFINER, search_path and grants unchanged):
--        - live_session_create: also copies `points` into the live_session_questions snapshot.
--        - live_answer_submit: score = round(question points * (1 - elapsed/limit/2)), i.e. the old formula
--          scaled by points/1000. Keep in sync with lib/live.ts scorePoints.
--        - live_session_end: team XP counts at most 1000 per answer (least(a.points, 1000)).
--   Bodies copied from 20261108000000_live_quiz.sql (no later migration redefines these functions).

BEGIN;

-- ===========================================================================
-- 1. Columns
-- ===========================================================================

ALTER TABLE public.live_quiz_questions
  ADD COLUMN points integer NOT NULL DEFAULT 1000,
  ADD CONSTRAINT live_quiz_questions_points_check CHECK (points BETWEEN 100 AND 5000 AND points % 100 = 0);

ALTER TABLE public.live_session_questions
  ADD COLUMN points integer NOT NULL DEFAULT 1000,
  ADD CONSTRAINT live_session_questions_points_check CHECK (points BETWEEN 100 AND 5000 AND points % 100 = 0);

-- ===========================================================================
-- 2. Widen live_answers.points upper bound (1000 -> 5000)
-- ===========================================================================

ALTER TABLE public.live_answers DROP CONSTRAINT live_answers_points_check;
ALTER TABLE public.live_answers
  ADD CONSTRAINT live_answers_points_check CHECK (points >= 0 AND points <= 5000);

-- ===========================================================================
-- 3. RPC functions
-- ===========================================================================

-- 3.1 live_session_create: snapshot now includes points
CREATE OR REPLACE FUNCTION public.live_session_create(
  p_host text,
  p_quiz uuid,
  p_course text,
  p_pin text,
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

REVOKE ALL ON FUNCTION public.live_session_create(text, uuid, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_session_create(text, uuid, text, text, boolean, boolean) TO service_role;


-- 3.2 live_session_end: team XP caps each answer at 1000 regardless of question points
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
  RETURN 'ok';
END;
$fn$;

REVOKE ALL ON FUNCTION public.live_session_end(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_session_end(uuid, text, integer) TO service_role;


-- 3.3 live_answer_submit: score scaled by the question's points
CREATE OR REPLACE FUNCTION public.live_answer_submit(
  p_session uuid, p_user text, p_idx integer, p_chosen text, p_now timestamptz
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_session public.live_sessions%ROWTYPE;
  v_question public.live_session_questions%ROWTYPE;
  v_correct boolean;
  v_elapsed numeric;
  v_limit numeric;
  v_points integer;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session FOR SHARE;
  IF NOT FOUND THEN RETURN 'closed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.live_players WHERE session_id = p_session AND user_id = p_user
  ) THEN RETURN 'not_player'; END IF;
  IF v_session.phase <> 'question' OR v_session.current_index IS DISTINCT FROM p_idx THEN
    RETURN 'closed';
  END IF;
  IF p_now IS NULL OR v_session.question_started_at IS NULL OR v_session.question_deadline_at IS NULL THEN
    RETURN 'closed';
  END IF;
  IF p_now > v_session.question_deadline_at + interval '500 milliseconds' THEN RETURN 'late'; END IF;
  SELECT * INTO v_question FROM public.live_session_questions WHERE session_id = p_session AND idx = p_idx;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_question.choices) AS c WHERE c->>'id' = p_chosen
  ) THEN RETURN 'invalid'; END IF;
  v_correct := p_chosen = v_question.answer;
  v_limit := v_question.time_limit_sec * 1000;
  v_elapsed := greatest(0, least(extract(epoch FROM (p_now - v_session.question_started_at)) * 1000, v_limit));
  -- Keep this formula in sync with lib/live.js scorePoints.
  v_points := CASE WHEN v_correct THEN round(v_question.points * (1 - (v_elapsed / v_limit) / 2))::integer ELSE 0 END;
  INSERT INTO public.live_answers (session_id, question_idx, user_id, chosen, correct, points, answered_at)
  VALUES (p_session, p_idx, p_user, p_chosen, v_correct, v_points, p_now)
  ON CONFLICT (session_id, question_idx, user_id) DO NOTHING;
  IF NOT FOUND THEN RETURN 'duplicate'; END IF;
  RETURN 'ok';
END;
$fn$;

REVOKE ALL ON FUNCTION public.live_answer_submit(uuid, text, integer, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_answer_submit(uuid, text, integer, text, timestamptz) TO service_role;


NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (the DROPs only exist here, plus the one constraint swap above). Run top to bottom.
-- Warning: answers scored above 1000 would violate the restored check; delete or clamp them first.
-- Restoring the old function bodies means re-running the three CREATE FUNCTION bodies from
-- 20261108000000_live_quiz.sql (sections 5.1, 5.2 and live_answer_submit) with CREATE OR REPLACE.
-- ===========================================================================
-- BEGIN;
-- UPDATE public.live_answers SET points = 1000 WHERE points > 1000;
-- ALTER TABLE public.live_answers DROP CONSTRAINT live_answers_points_check;
-- ALTER TABLE public.live_answers ADD CONSTRAINT live_answers_points_check CHECK (points >= 0 AND points <= 1000);
-- ALTER TABLE public.live_session_questions DROP CONSTRAINT live_session_questions_points_check;
-- ALTER TABLE public.live_session_questions DROP COLUMN points;
-- ALTER TABLE public.live_quiz_questions DROP CONSTRAINT live_quiz_questions_points_check;
-- ALTER TABLE public.live_quiz_questions DROP COLUMN points;
-- (then re-create the three functions from 20261108000000_live_quiz.sql, otherwise they reference the dropped column)
-- COMMIT;
