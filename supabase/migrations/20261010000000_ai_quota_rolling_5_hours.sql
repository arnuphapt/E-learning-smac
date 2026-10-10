-- AI quota, rolling 5 hours: claim a slot BEFORE calling Gemini.
-- Updates public.ai_quota_claim() window from calendar-day (00:00 Bangkok)
-- to rolling 5 hours (created_at >= now() - interval '5 hours').

BEGIN;

CREATE OR REPLACE FUNCTION public.ai_quota_claim(
  p_student text, p_limit integer, p_mode text, p_lesson text, p_course text, p_session text
)
RETURNS TABLE (claim_id uuid, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_n     integer;
  v_id    uuid;
BEGIN
  IF p_student IS NULL OR p_student = '' OR p_limit IS NULL OR p_mode IS NULL OR p_mode NOT IN ('chat', 'summarize', 'explain') THEN
    RAISE EXCEPTION 'ai_quota_claim: bad arguments' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('ai_quota:' || p_student));

  -- claims that were never released (crashed request) stop counting after 10 minutes
  DELETE FROM public.ai_chat_logs
   WHERE student_id = p_student AND reply = '' AND created_at < now() - interval '10 minutes';

  -- Rolling 5-hour window
  SELECT count(*) INTO v_n
    FROM public.ai_chat_logs
   WHERE student_id = p_student
     AND mode IN ('chat', 'summarize', 'explain')
     AND created_at >= (now() - interval '5 hours');

  IF v_n >= p_limit THEN
    RETURN QUERY SELECT NULL::uuid, v_n;
    RETURN;
  END IF;

  INSERT INTO public.ai_chat_logs (student_id, lesson_id, course_id, message, reply, mode, session_id)
  VALUES (p_student, p_lesson, p_course, '', '', p_mode, p_session)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_n + 1;
END
$fn$;

REVOKE ALL ON FUNCTION public.ai_quota_claim(text, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_quota_claim(text, integer, text, text, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

