-- AI daily quota, atomic: claim a slot BEFORE calling Gemini (count-then-call-then-log let N parallel requests all pass).
-- APPLIED 2026-10-06 on qsvwabaxqtbrxrwrqtih. Proof (self-aborting, rolls back): supabase/proofs/20261006040000_ai_quota_claim_proof.sql
-- Standalone: touches only ai_chat_logs (live) and needs no tutor migration, but the code of the same commit
-- (api/ai/chat + api/tutor/attempts/<id>/explain) is the first caller, so it is written to go out after 030000.
--
-- ROLLOUT ORDER: apply AFTER 20261006030000 and BEFORE deploying the code of the same commit: both routes now call
-- ai_quota_claim() and answer 500 / 502 while it does not exist (fail closed, nothing is generated for free).
--
-- What it does (no DROP statements in the forward path; no table or policy change):
--   public.ai_quota_claim(p_student, p_limit, p_mode, p_lesson, p_course, p_session) -> (claim_id uuid, used integer)
--     1. pg_advisory_xact_lock(hashtext('ai_quota:' || p_student)): claims of ONE student run one after another;
--        other students do not wait for each other. The lock is released at the end of the statement's transaction.
--     2. counts today's rows of that student (Bangkok calendar day, rows with mode chat / summarize / explain: the same
--        window and modes the routes counted before) and, below the limit, inserts a CLAIM row and returns its id.
--        At or over the limit it returns claim_id NULL and used = the count (nothing inserted).
--        used on success = the count INCLUDING the new claim (what the UI shows as "used").
--     3. a claim row is an ai_chat_logs row with message = '' and reply = '' (both columns are NOT NULL, and no real
--        row has an empty reply: 0 of 116 on 2026-10-06). The route fills message + reply after Gemini answers, or
--        deletes the row when the call fails (failed calls stay uncounted, as before).
--        Readers that list history (student chat history x2, instructor ai-logs) filter reply <> '' in the same commit.
--        A claim that was never released (crashed request) is deleted by the next claim of the same student once it is
--        older than 10 minutes; until then it counts as a call (a safe over-count, never an under-count).
--     p_mode must be chat / summarize / explain (22023 otherwise): the route normalizes the client-supplied mode, so a
--        made-up mode can no longer dodge the counter.
--   SECURITY DEFINER, search_path = '' (repo convention): runs as the table owner. EXECUTE: service_role ONLY. The
--   routes call it with the service role and pass the student id taken from the NextAuth session, never from the body.
--   authenticated / anon cannot call it (PostgREST would otherwise expose it to every signed-in student).
--
-- Inspected read-only on qsvwabaxqtbrxrwrqtih (2026-10-06): ai_chat_logs(id uuid pk, student_id text -> users, lesson_id
-- text -> lessons, course_id text -> courses_all, message text NOT NULL, reply text NOT NULL, mode text NOT NULL,
-- created_at timestamptz default now(), session_id text, hidden_by_student boolean NOT NULL default false); RLS on
-- (select own or instructor, insert own as authenticated), not forced, owner postgres; service_role has all table grants.

BEGIN;

CREATE FUNCTION public.ai_quota_claim(
  p_student text, p_limit integer, p_mode text, p_lesson text, p_course text, p_session text
)
RETURNS TABLE (claim_id uuid, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
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

  -- today in Bangkok (UTC+7, no DST): [00:00, next 00:00)
  v_start := date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok';
  v_end   := (date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') + interval '1 day') AT TIME ZONE 'Asia/Bangkok';

  SELECT count(*) INTO v_n
    FROM public.ai_chat_logs
   WHERE student_id = p_student
     AND mode IN ('chat', 'summarize', 'explain')
     AND created_at >= v_start AND created_at < v_end;

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

-- ===========================================================================
-- ROLLBACK (the DROP only exists here). Roll the code back first (it calls the function). Any claim rows still
-- in flight (reply = '') are harmless; delete them with:  DELETE FROM public.ai_chat_logs WHERE reply = '';
-- ===========================================================================
-- BEGIN;
-- DROP FUNCTION public.ai_quota_claim(text, integer, text, text, text, text);
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
