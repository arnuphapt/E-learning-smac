-- Proof for supabase/migrations/20261010000000_ai_quota_rolling_5_hours.sql
-- SELF-ABORTING: runs in a transaction and always rolls back.
BEGIN;

-- Apply function update
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

-- Test: inserts a 6-hour-old record and a 2-hour-old record, then verifies count
DO $test$
DECLARE
  v_test_stud text := 'fx_test_student_5h';
  v_res record;
BEGIN
  -- Insert old log (> 5 hours ago)
  INSERT INTO public.ai_chat_logs (student_id, message, reply, mode, created_at)
  VALUES (v_test_stud, 'old question', 'old answer', 'chat', now() - interval '6 hours');

  -- Insert recent log (< 5 hours ago)
  INSERT INTO public.ai_chat_logs (student_id, message, reply, mode, created_at)
  VALUES (v_test_stud, 'recent question', 'recent answer', 'chat', now() - interval '2 hours');

  -- Claim 1: limit 2 -> should succeed with used = 2 (1 recent + 1 new claim)
  SELECT * INTO v_res FROM public.ai_quota_claim(v_test_stud, 2, 'chat', NULL, NULL, NULL);
  IF v_res.claim_id IS NULL OR v_res.used <> 2 THEN
    RAISE EXCEPTION 'TEST FAILED: expected claim_id not null and used=2, got claim_id=% used=%', v_res.claim_id, v_res.used;
  END IF;

  -- Claim 2: limit 2 -> should fail (claim_id is null, used = 2)
  SELECT * INTO v_res FROM public.ai_quota_claim(v_test_stud, 2, 'chat', NULL, NULL, NULL);
  IF v_res.claim_id IS NOT NULL OR v_res.used <> 2 THEN
    RAISE EXCEPTION 'TEST FAILED: expected claim_id null and used=2, got claim_id=% used=%', v_res.claim_id, v_res.used;
  END IF;

  RAISE NOTICE 'ALL 5-HOUR QUOTA PROOF CHECKS PASSED';
END
$test$;

ROLLBACK;

