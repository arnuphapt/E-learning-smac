-- Tutor mode: per-lesson attempt limit ("ทำซ้ำได้" = unlimited, "ทำได้ครั้งเดียว" = 1), enforced in the database,
-- and a per-lesson round time (minutes; NULL = the default of 1 minute per drawn question).
-- APPLIED on prod qsvwabaxqtbrxrwrqtih 2026-10-12 (version 20261012074151, proof 32/32 PASS beforehand). Proof (self-aborting, rolls back): supabase/proofs/20261011050000_tutor_attempt_limit_proof.sql
-- Requires 20261006020000_tutor_attempts.sql (tutor_attempts) and 20261006010000_tutor_bank.sql (lessons tutor columns).
--
-- ROLLOUT ORDER: apply this SQL BEFORE deploying the code of the same commit. The tutor pages / attempt route select
-- lessons.tutor_max_attempts, which does not exist until this runs (the lesson and attempt routes answer 500 meanwhile).
-- Safe to apply early: every existing lesson gets NULL = unlimited = today's behaviour, and the old code ignores the column.
--
-- Why: students retake a round until they have seen the whole bank and memorise it. An instructor can now make a lesson once-only.
-- The round time was fixed at 1 minute per question; an instructor can now set the whole round's minutes per lesson.
--
-- What it does (no DROP statements in the forward path):
--   1. lessons.tutor_max_attempts (integer, NULL = unlimited, else >= 1): rounds one student may START on the lesson.
--        Same table as the other per-lesson tutor setting (tutor_draw_count). Integer, so a future "N times" needs no schema change.
--        Every started round counts: submitted, expired (auto-submitted at the deadline) or abandoned in progress.
--   1b. lessons.tutor_time_limit_minutes (integer, NULL = default rule, else 1..180): minutes for the whole round. NULL keeps today's
--        rule (deadline_at = started_at + 1 minute per drawn question), so every existing lesson behaves exactly as before.
--        Used by the attempt route (application code) when it sets deadline_at at start; the deadline stays server-side and is
--        stored on the attempt row, so a later change of the setting never moves a round that is already running.
--        No SQL computes deadline_at: nothing else changes in the database for this.
--   2. tutor_attempts BEFORE INSERT trigger tutor_attempt_limit_guard(): the enforcement. The attempt route starts a round with
--        a plain INSERT as service_role; the trigger runs inside that same statement:
--          a. reads the lesson's limit; NULL -> return, no lock, no extra cost for unlimited lessons;
--          b. pg_advisory_xact_lock(hashtext('tutor_attempt:' || student || ':' || lesson)): starts of ONE student on ONE
--             lesson run one after another (same pattern as ai_quota_claim). The lock is released when the insert's transaction ends;
--          c. counts the student's rounds on the lesson (any status; the count runs after the lock, in a fresh READ COMMITTED
--             snapshot, so it sees a concurrent start that committed while this one waited) and raises SQLSTATE TA001
--             'tutor_attempt_limit' when count >= limit.
--        Race-safe: two concurrent starts on a once-only lesson serialize on the lock; the second counts the first and fails.
--        Why a trigger and not a function the route calls: the count and the insert are then one atomic step by construction,
--        no second code path can forget the check, and the route's insert call stays as it is. Why not a constraint: the limit
--        is per-lesson data and a unique index cannot express "N rows"; CHECK cannot see other rows.
--        An open round is never refused here: the route resumes it before it ever inserts (and the unique index
--        tutor_attempts_one_open_key still stops a second open round).
--        SECURITY DEFINER, search_path = '' (repo convention): it reads lessons / tutor_attempts as the owner. Trigger
--        functions cannot be called directly; EXECUTE is revoked from PUBLIC / anon / authenticated anyway.
--
-- Limits (by design): lowering a lesson from NULL to 1 counts the rounds students ALREADY have, so students who already did one
-- round are locked out at once. Staff previews count too (the trigger does not know the caller's role).

BEGIN;

-- 1. the settings
ALTER TABLE public.lessons
  ADD COLUMN tutor_max_attempts integer
  CONSTRAINT lessons_tutor_max_attempts_check CHECK (tutor_max_attempts IS NULL OR tutor_max_attempts >= 1);

ALTER TABLE public.lessons
  ADD COLUMN tutor_time_limit_minutes integer
  CONSTRAINT lessons_tutor_time_limit_minutes_check CHECK (tutor_time_limit_minutes IS NULL OR tutor_time_limit_minutes BETWEEN 1 AND 180);

-- 2. the guard
CREATE FUNCTION public.tutor_attempt_limit_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_max  integer;
  v_used integer;
BEGIN
  SELECT l.tutor_max_attempts INTO v_max FROM public.lessons l WHERE l.id = NEW.lesson_id;
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('tutor_attempt:' || NEW.student_id || ':' || NEW.lesson_id));

  SELECT count(*) INTO v_used
    FROM public.tutor_attempts a
   WHERE a.student_id = NEW.student_id AND a.lesson_id = NEW.lesson_id;

  IF v_used >= v_max THEN
    RAISE EXCEPTION 'tutor_attempt_limit' USING ERRCODE = 'TA001';
  END IF;
  RETURN NEW;
END
$fn$;

REVOKE ALL ON FUNCTION public.tutor_attempt_limit_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tutor_attempts_limit_guard
  BEFORE INSERT ON public.tutor_attempts
  FOR EACH ROW EXECUTE FUNCTION public.tutor_attempt_limit_guard();

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (the DROPs only exist here). Roll the code back first (it selects the column). Existing attempts are untouched.
-- ===========================================================================
-- BEGIN;
-- DROP TRIGGER tutor_attempts_limit_guard ON public.tutor_attempts;
-- DROP FUNCTION public.tutor_attempt_limit_guard();
-- ALTER TABLE public.lessons DROP COLUMN tutor_max_attempts, DROP COLUMN tutor_time_limit_minutes;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
