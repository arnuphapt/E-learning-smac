-- Live Quiz advance in one round trip, ticket 07 (faster reveal / next).
-- Written for Dice to run manually in the Supabase SQL Editor. Do not run via CLI/MCP.
--
-- What it does:
--   Adds ONE new function, public.live_session_advance(p_session, p_host, p_action, p_now). No table changes.
--   It replaces the advance route's session SELECT + live_session_questions SELECT + UPDATE (3 round trips) with
--   one call that locks the session row (FOR UPDATE, like live_session_end), validates, and updates atomically.
--   Returns one row (status, phase, current_index); the route maps status to HTTP:
--     'ok'                 -> 200 {phase, current_index}
--     'not_found'          -> 404 Session not found
--     'forbidden'          -> 403 Forbidden (p_host is not live_sessions.host_id)
--     'invalid'            -> 409 Invalid phase transition
--     'question_not_found' -> 500 Question not found (no live_session_questions row for the next index)
--   Transitions mirror nextPhase in lib/live.ts (keep in sync):
--     start       lobby       -> question, index 0
--     reveal      question    -> reveal, same index
--     leaderboard reveal      -> leaderboard, same index
--     next        leaderboard -> question, index + 1, only while index + 1 < total
--   Anything else (including 'end' / 'finish', which stay on live_session_end) -> 'invalid'.
--   Entering 'question' stamps question_started_at = p_now and question_deadline_at = p_now + time_limit_sec
--   (p_now is the app server clock, as before, because live_answer_submit compares it with the app-clock p_now
--   of the answer route; DB clock is deliberately not used). time_limit_sec falls back to 20 when it is 0.
--   The old route guarded with "WHERE phase = <read phase> AND current_index = <read index>" (a 409 conflict if the
--   row moved between its read and its update). The row lock makes read + update atomic, so a concurrent
--   duplicate (e.g. two 'reveal' calls) now gets 'invalid' (409) from the second caller instead; same HTTP result.
--
-- SECURITY DEFINER, search_path = '', callable by service_role only.

BEGIN;

CREATE FUNCTION public.live_session_advance(
  p_session uuid, p_host text, p_action text, p_now timestamptz
)
RETURNS TABLE (status text, phase text, current_index integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_session public.live_sessions%ROWTYPE;
  v_phase text;
  v_index integer;
  v_limit integer;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::integer;
    RETURN;
  END IF;
  IF v_session.host_id IS DISTINCT FROM p_host THEN
    RETURN QUERY SELECT 'forbidden'::text, NULL::text, NULL::integer;
    RETURN;
  END IF;

  IF p_action = 'start' AND v_session.phase = 'lobby' THEN
    v_phase := 'question'; v_index := 0;
  ELSIF p_action = 'reveal' AND v_session.phase = 'question' THEN
    v_phase := 'reveal'; v_index := v_session.current_index;
  ELSIF p_action = 'leaderboard' AND v_session.phase = 'reveal' THEN
    v_phase := 'leaderboard'; v_index := v_session.current_index;
  ELSIF p_action = 'next' AND v_session.phase = 'leaderboard' AND v_session.current_index + 1 < v_session.total THEN
    v_phase := 'question'; v_index := v_session.current_index + 1;
  ELSE
    RETURN QUERY SELECT 'invalid'::text, NULL::text, NULL::integer;
    RETURN;
  END IF;

  IF v_phase = 'question' THEN
    SELECT q.time_limit_sec INTO v_limit
    FROM public.live_session_questions q
    WHERE q.session_id = p_session AND q.idx = v_index;
    IF NOT FOUND THEN
      RETURN QUERY SELECT 'question_not_found'::text, NULL::text, NULL::integer;
      RETURN;
    END IF;
    IF coalesce(v_limit, 0) = 0 THEN v_limit := 20; END IF;

    UPDATE public.live_sessions ls
    SET phase = v_phase,
        current_index = v_index,
        question_started_at = p_now,
        question_deadline_at = p_now + make_interval(secs => v_limit)
    WHERE ls.id = p_session;
  ELSE
    UPDATE public.live_sessions ls
    SET phase = v_phase,
        current_index = v_index
    WHERE ls.id = p_session;
  END IF;

  RETURN QUERY SELECT 'ok'::text, v_phase, v_index;
END;
$fn$;

REVOKE ALL ON FUNCTION public.live_session_advance(uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_session_advance(uuid, text, text, timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (the DROP only exists here). The advance route must be reverted first, otherwise it calls a missing function.
-- ===========================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.live_session_advance(uuid, text, text, timestamptz);
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
