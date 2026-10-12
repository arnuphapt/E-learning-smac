-- Proof for supabase/migrations/20261011050000_tutor_attempt_limit.sql.
-- SELF-ABORTING: everything runs in one transaction that ends with RAISE EXCEPTION, so nothing persists.
-- Run it in the Supabase SQL Editor. The "error" it ends with IS the report:
--   ERROR: PROOF RESULT <one line per check: step => PASS | FAIL>
-- Expected: every line starts with PASS.
-- Contains the migration statements verbatim (kept in sync by hand: if you edit one, edit the other), so run it BEFORE the
-- migration is applied. If the migration IS applied, delete section 1 (ADD COLUMN / CREATE FUNCTION would fail).
-- Requires 20261006020000_tutor_attempts.sql and 20261006010000_tutor_bank.sql to be applied. Fixtures use ids prefixed fx_.
-- NOT proved here: true parallel sessions (one SQL Editor transaction cannot race itself). Check e1 proves the lock is taken
-- (pg_locks) and the d-checks prove the count that follows it; the serialization itself is Postgres' advisory-lock guarantee.
BEGIN;

CREATE TEMP TABLE proof(step text, result text);
GRANT ALL ON proof TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Migration statements (from 20261011050000_tutor_attempt_limit.sql, without BEGIN / COMMIT / NOTIFY)
-- ---------------------------------------------------------------------------
ALTER TABLE public.lessons
  ADD COLUMN tutor_max_attempts integer
  CONSTRAINT lessons_tutor_max_attempts_check CHECK (tutor_max_attempts IS NULL OR tutor_max_attempts >= 1);

ALTER TABLE public.lessons
  ADD COLUMN tutor_time_limit_minutes integer
  CONSTRAINT lessons_tutor_time_limit_minutes_check CHECK (tutor_time_limit_minutes IS NULL OR tutor_time_limit_minutes BETWEEN 1 AND 180);

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

-- ---------------------------------------------------------------------------
-- a. existing data / trigger / grants
-- ---------------------------------------------------------------------------
INSERT INTO proof SELECT 'a1 every existing lesson is unlimited (NULL): ' || count(*) || ' lessons',
  CASE WHEN count(*) FILTER (WHERE tutor_max_attempts IS NOT NULL) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.lessons;

INSERT INTO proof SELECT 'a1b every existing lesson has the default round time (NULL): ' || count(*) || ' lessons',
  CASE WHEN count(*) FILTER (WHERE tutor_time_limit_minutes IS NOT NULL) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.lessons;

INSERT INTO proof SELECT 'a2 trigger is BEFORE INSERT FOR EACH ROW on tutor_attempts',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'public.tutor_attempts'::regclass
                      AND t.tgname = 'tutor_attempts_limit_guard' AND NOT t.tgisinternal
                      AND (t.tgtype & 1) = 1 AND (t.tgtype & 2) = 2 AND (t.tgtype & 4) = 4)
       THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'a3 guard function: anon / authenticated / PUBLIC cannot EXECUTE',
  CASE WHEN NOT has_function_privilege('anon', 'public.tutor_attempt_limit_guard()', 'EXECUTE')
        AND NOT has_function_privilege('authenticated', 'public.tutor_attempt_limit_guard()', 'EXECUTE')
        AND NOT EXISTS (SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
                         WHERE p.oid = 'public.tutor_attempt_limit_guard()'::regprocedure AND x.grantee = 0)
       THEN 'PASS' ELSE 'FAIL' END;

-- ---------------------------------------------------------------------------
-- fixtures
-- ---------------------------------------------------------------------------
INSERT INTO public.users(id, name, role) VALUES
  ('fx_s1', 'FX S1', 'student'), ('fx_s2', 'FX S2', 'student'), ('fx_s3', 'FX S3', 'student'),
  ('fx_staff', 'FX Staff', 'instructor');
INSERT INTO public.courses_all(id, code, title, kind) VALUES ('fx_tutor', 'FX2', 'fixture tutor', 'tutor');
INSERT INTO public.lessons(id, course_id, title, status, index) VALUES
  ('fx_l_free', 'fx_tutor', 'unlimited', 'active', 1),
  ('fx_l_once', 'fx_tutor', 'once',      'active', 2),
  ('fx_l_two',  'fx_tutor', 'twice',     'active', 3);

-- ---------------------------------------------------------------------------
-- b. CHECK on the setting
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  UPDATE public.lessons SET tutor_max_attempts = 0 WHERE id = 'fx_l_once';
  INSERT INTO proof VALUES ('b1 CHECK rejects 0', 'FAIL: accepted');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('b1 CHECK rejects 0', 'PASS'); END $$;
DO $$ BEGIN
  UPDATE public.lessons SET tutor_max_attempts = -1 WHERE id = 'fx_l_once';
  INSERT INTO proof VALUES ('b2 CHECK rejects -1', 'FAIL: accepted');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('b2 CHECK rejects -1', 'PASS'); END $$;

-- round time setting: bounds 1..180, NULL allowed (deadline_at itself is computed by the app, not by SQL)
DO $$ BEGIN
  UPDATE public.lessons SET tutor_time_limit_minutes = 0 WHERE id = 'fx_l_free';
  INSERT INTO proof VALUES ('b3 time CHECK rejects 0', 'FAIL: accepted');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('b3 time CHECK rejects 0', 'PASS'); END $$;
DO $$ BEGIN
  UPDATE public.lessons SET tutor_time_limit_minutes = 181 WHERE id = 'fx_l_free';
  INSERT INTO proof VALUES ('b4 time CHECK rejects 181', 'FAIL: accepted');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('b4 time CHECK rejects 181', 'PASS'); END $$;
DO $$ BEGIN
  UPDATE public.lessons SET tutor_time_limit_minutes = -5 WHERE id = 'fx_l_free';
  INSERT INTO proof VALUES ('b5 time CHECK rejects -5', 'FAIL: accepted');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('b5 time CHECK rejects -5', 'PASS'); END $$;
DO $$ BEGIN
  UPDATE public.lessons SET tutor_time_limit_minutes = 1 WHERE id = 'fx_l_free';
  UPDATE public.lessons SET tutor_time_limit_minutes = 180 WHERE id = 'fx_l_free';
  UPDATE public.lessons SET tutor_time_limit_minutes = NULL WHERE id = 'fx_l_free';
  INSERT INTO proof VALUES ('b6 time CHECK accepts 1, 180 and NULL', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b6 time CHECK accepts 1, 180 and NULL', 'FAIL: ' || SQLERRM); END $$;

-- ---------------------------------------------------------------------------
-- c. unlimited lesson (NULL): many rounds, and the guard takes no lock at all
-- ---------------------------------------------------------------------------
INSERT INTO proof SELECT 'c0 no advisory lock held before any limited insert (' || count(*) || ')',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL (this session already holds advisory locks: e1 is unreliable)' END
  FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();

DO $$ BEGIN
  FOR i IN 1..4 LOOP
    INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at, status, submitted_at)
    VALUES ('fx_s1', 'fx_l_free', ARRAY['fx_q1'], 1, now() + interval '1 minute', 'expired', now());
  END LOOP;
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_free', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('c1 unlimited lesson allows 5 rounds (4 ended + 1 open)', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c1 unlimited lesson allows many rounds', 'FAIL: ' || SQLERRM); END $$;

INSERT INTO proof SELECT 'c2 unlimited inserts took no advisory lock',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();

-- ---------------------------------------------------------------------------
-- d. once-only lesson (limit 1)
-- ---------------------------------------------------------------------------
UPDATE public.lessons SET tutor_max_attempts = 1 WHERE id = 'fx_l_once';
INSERT INTO proof SELECT 'd0 CHECK accepts 1',
  CASE WHEN (SELECT tutor_max_attempts FROM public.lessons WHERE id = 'fx_l_once') = 1 THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_once', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('d1 first round of a once-only lesson starts', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('d1 first round starts', 'FAIL: ' || SQLERRM); END $$;

INSERT INTO proof SELECT 'e1 the guard took the advisory lock on the limited insert',
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL: ' || count(*) END
  FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();

-- a second start while the first is still open (the route resumes instead; the DB refuses regardless)
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_once', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('d2 second round while the first is open is refused', 'FAIL: accepted');
EXCEPTION WHEN SQLSTATE 'TA001' THEN INSERT INTO proof VALUES ('d2 second round while the first is open is refused (TA001, before the unique index)', 'PASS');
          WHEN OTHERS THEN INSERT INTO proof VALUES ('d2 second round while open is refused', 'FAIL: ' || SQLSTATE || ' ' || SQLERRM); END $$;

-- ended rounds (expired / submitted) count just like abandoned ones
UPDATE public.tutor_attempts SET status = 'expired', submitted_at = now() WHERE student_id = 'fx_s1' AND lesson_id = 'fx_l_once';
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_once', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('d3 second round after the first expired is refused', 'FAIL: accepted');
EXCEPTION WHEN SQLSTATE 'TA001' THEN INSERT INTO proof VALUES ('d3 second round after the first expired is refused (TA001)', 'PASS');
          WHEN OTHERS THEN INSERT INTO proof VALUES ('d3 second round after it expired is refused', 'FAIL: ' || SQLSTATE || ' ' || SQLERRM); END $$;

UPDATE public.tutor_attempts SET status = 'submitted', score = 0 WHERE student_id = 'fx_s1' AND lesson_id = 'fx_l_once';
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_once', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('d4 second round after the first was submitted is refused', 'FAIL: accepted');
EXCEPTION WHEN SQLSTATE 'TA001' THEN INSERT INTO proof VALUES ('d4 second round after the first was submitted is refused (TA001)', 'PASS');
          WHEN OTHERS THEN INSERT INTO proof VALUES ('d4 second round after submit is refused', 'FAIL: ' || SQLSTATE || ' ' || SQLERRM); END $$;

INSERT INTO proof SELECT 'd5 the refused inserts left exactly 1 round (' || count(*) || ')',
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END
  FROM public.tutor_attempts WHERE student_id = 'fx_s1' AND lesson_id = 'fx_l_once';

-- the limit is per student and per lesson
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s2', 'fx_l_once', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('d6 another student can start the same once-only lesson', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('d6 another student can start the same lesson', 'FAIL: ' || SQLERRM); END $$;
DO $$ BEGIN
  UPDATE public.tutor_attempts SET status = 'expired', submitted_at = now() WHERE student_id = 'fx_s1' AND lesson_id = 'fx_l_free' AND status = 'in_progress';
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_free', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('d7 the same student is still unlimited on another (NULL) lesson', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('d7 same student, unlimited lesson', 'FAIL: ' || SQLERRM); END $$;

-- ---------------------------------------------------------------------------
-- f. limit 2: two rounds, the third is refused (the setting is an integer, not a boolean)
-- ---------------------------------------------------------------------------
UPDATE public.lessons SET tutor_max_attempts = 2 WHERE id = 'fx_l_two';
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at, status, submitted_at)
  VALUES ('fx_s1', 'fx_l_two', ARRAY['fx_q1'], 1, now() + interval '1 minute', 'expired', now());
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_two', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('f1 limit 2 allows 2 rounds', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f1 limit 2 allows 2 rounds', 'FAIL: ' || SQLERRM); END $$;
UPDATE public.tutor_attempts SET status = 'expired', submitted_at = now() WHERE student_id = 'fx_s1' AND lesson_id = 'fx_l_two' AND status = 'in_progress';
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s1', 'fx_l_two', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('f2 limit 2 refuses the 3rd round', 'FAIL: accepted');
EXCEPTION WHEN SQLSTATE 'TA001' THEN INSERT INTO proof VALUES ('f2 limit 2 refuses the 3rd round (TA001)', 'PASS');
          WHEN OTHERS THEN INSERT INTO proof VALUES ('f2 limit 2 refuses the 3rd round', 'FAIL: ' || SQLSTATE || ' ' || SQLERRM); END $$;

-- ---------------------------------------------------------------------------
-- g. as the roles that really touch it
-- ---------------------------------------------------------------------------
-- service_role (the attempt route): the SECURITY DEFINER guard works for a role with no direct grant on the function
SET LOCAL ROLE service_role;
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s3', 'fx_l_once', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('g1 service_role starts a once-only round', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g1 service_role starts a once-only round', 'FAIL: ' || SQLERRM); END $$;
DO $$ BEGIN
  UPDATE public.tutor_attempts SET status = 'expired', submitted_at = now() WHERE student_id = 'fx_s3' AND lesson_id = 'fx_l_once';
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
  VALUES ('fx_s3', 'fx_l_once', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('g2 service_role is refused a second round', 'FAIL: accepted');
EXCEPTION WHEN SQLSTATE 'TA001' THEN INSERT INTO proof VALUES ('g2 service_role is refused a second round (TA001)', 'PASS');
          WHEN OTHERS THEN INSERT INTO proof VALUES ('g2 service_role refused a second round', 'FAIL: ' || SQLSTATE || ' ' || SQLERRM); END $$;
RESET ROLE;

-- a student cannot call the guard directly, nor change the limit
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_s1","app_role":"student"}', true);
DO $$ BEGIN
  PERFORM public.tutor_attempt_limit_guard();
  INSERT INTO proof VALUES ('g3 authenticated cannot call the guard function', 'FAIL: callable');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g3 authenticated cannot call the guard function', 'PASS (' || SQLSTATE || ')'); END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE public.lessons SET tutor_max_attempts = NULL WHERE id = 'fx_l_once'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g4 a student cannot lift the limit (0 rows)', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL: ' || n END);
  UPDATE public.lessons SET tutor_time_limit_minutes = 180 WHERE id = 'fx_l_free'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g4b a student cannot change the round time (0 rows)', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g4 a student cannot lift the limit', 'PASS (error ' || SQLSTATE || ')'); END $$;
RESET ROLE;

-- an instructor sets and clears it through the path the workspace UI uses (PostgREST update as authenticated)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_staff","app_role":"instructor"}', true);
DO $$ DECLARE n int; BEGIN
  UPDATE public.lessons SET tutor_max_attempts = 1 WHERE id = 'fx_l_free'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g5 an instructor can set the limit (1 row)', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL: ' || n END);
  UPDATE public.lessons SET tutor_max_attempts = NULL WHERE id = 'fx_l_free'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g6 an instructor can clear the limit back to NULL (1 row)', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g5/g6 instructor sets the limit', 'FAIL: ' || SQLERRM); END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE public.lessons SET tutor_time_limit_minutes = 45 WHERE id = 'fx_l_free'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g7 an instructor can set the round time (1 row)', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL: ' || n END);
  UPDATE public.lessons SET tutor_time_limit_minutes = NULL WHERE id = 'fx_l_free'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g8 an instructor can clear the round time back to NULL (1 row)', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g7/g8 instructor sets the round time', 'FAIL: ' || SQLERRM); END $$;
RESET ROLE;

DO $$ BEGIN
  RAISE EXCEPTION E'PROOF RESULT\n%', (SELECT string_agg(step || ' => ' || result, E'\n' ORDER BY step) FROM proof);
END $$;
