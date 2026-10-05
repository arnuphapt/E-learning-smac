-- Proof for supabase/migrations/20261006030000_tutor_result.sql.
-- SELF-ABORTING: everything runs in one transaction that ends with RAISE EXCEPTION, so nothing persists.
-- Run it in the Supabase SQL Editor (or MCP execute_sql). The "error" it ends with IS the report:
--   ERROR: PROOF RESULT <one line per check: step => PASS | FAIL | OK (control)>
-- Expected: every a/b/c/d/e/g line starts with PASS, every z (negative control) line says "OK (...)".
-- 20261006010000 and 20261006020000 may NOT be applied yet, so sections 1 and 2 repeat THEIR statements verbatim (copied
-- from the migration bodies, no BEGIN/COMMIT/NOTIFY) and section 3 is this migration's body verbatim. If they ARE applied,
-- delete the sections already applied or the CREATE TABLE / ADD COLUMN statements fail. Keep them in sync by hand.
-- Fixtures use ids prefixed fx_. Checks run as student / other student / anon / instructor / service_role via
-- SET LOCAL ROLE + request.jwt.claims.
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Migration statements of 20261006010000_tutor_bank.sql (prerequisite)
-- ---------------------------------------------------------------------------
-- 1. tutor_topics
CREATE TABLE public.tutor_topics (
  id         text PRIMARY KEY,
  lesson_id  text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  name       text NOT NULL CONSTRAINT tutor_topics_name_check CHECK (btrim(name) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tutor_topics_id_lesson_key UNIQUE (id, lesson_id) -- target of questions_topic_fk
);
CREATE UNIQUE INDEX tutor_topics_lesson_name_key ON public.tutor_topics (lesson_id, lower(btrim(name)));

ALTER TABLE public.tutor_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY tutor_topics_all_instructor ON public.tutor_topics
  FOR ALL TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- default ACLs hand new relations to anon/authenticated/service_role with everything: reset, then grant what is needed.
REVOKE ALL ON public.tutor_topics FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_topics TO authenticated;
GRANT ALL ON public.tutor_topics TO service_role;

-- 2. questions: tutor support
ALTER TABLE public.questions
  ADD COLUMN topic_id    text,
  ADD COLUMN explanation text;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_topic_fk FOREIGN KEY (topic_id, lesson_id)
    REFERENCES public.tutor_topics (id, lesson_id) ON DELETE SET NULL (topic_id),
  ADD CONSTRAINT questions_tutor_fields_check
    CHECK (kind = 'tutor' OR (topic_id IS NULL AND explanation IS NULL));

-- 3. per-lesson draw count (NULL = use the whole bank)
ALTER TABLE public.lessons
  ADD COLUMN tutor_draw_count integer
  CONSTRAINT lessons_tutor_draw_count_check CHECK (tutor_draw_count IS NULL OR tutor_draw_count > 0);

-- 4. students never read tutor questions through the old path
CREATE OR REPLACE VIEW public.questions_student AS
  SELECT q.id, q.no, q.type, q.text, q.choices, q.lesson_id, q.kind
  FROM public.questions q
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE l.status = 'active'
    AND q.kind IS DISTINCT FROM 'tutor'
    AND NOT EXISTS (SELECT 1 FROM public.courses_all c WHERE c.id = l.course_id AND c.kind = 'tutor');

-- 5. lessons / assignments of a tutor course do not reach students through the existing paths
ALTER POLICY lessons_select ON public.lessons
  USING (
    status = 'active'
    AND (course_id IS NULL OR EXISTS (SELECT 1 FROM public.courses_all c WHERE c.id = lessons.course_id AND c.kind = 'course'))
  );

ALTER POLICY assignments_select ON public.assignments
  USING (
    course_id IS NULL
    OR EXISTS (SELECT 1 FROM public.courses_all c WHERE c.id = assignments.course_id AND c.kind = 'course')
  );

-- ---------------------------------------------------------------------------
-- 2. Migration statements of 20261006020000_tutor_attempts.sql (prerequisite)
-- ---------------------------------------------------------------------------
-- 1. tutor_attempts
CREATE TABLE public.tutor_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id    text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question_ids text[] NOT NULL,
  total        integer NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  deadline_at  timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'in_progress',
  score        integer,
  submitted_at timestamptz,
  CONSTRAINT tutor_attempts_status_check CHECK (status IN ('in_progress', 'submitted', 'expired')),
  CONSTRAINT tutor_attempts_total_check CHECK (total > 0 AND total = cardinality(question_ids)),
  CONSTRAINT tutor_attempts_deadline_check CHECK (deadline_at > started_at),
  CONSTRAINT tutor_attempts_score_check CHECK (score IS NULL OR (score >= 0 AND score <= total)),
  CONSTRAINT tutor_attempts_result_check CHECK (
    CASE status
      WHEN 'in_progress' THEN score IS NULL AND submitted_at IS NULL
      WHEN 'submitted'   THEN score IS NOT NULL AND submitted_at IS NOT NULL
      ELSE submitted_at IS NOT NULL
    END
  )
);
-- resume / "recently seen" reads: a student's rounds on one lesson, newest first
CREATE INDEX tutor_attempts_student_lesson_idx ON public.tutor_attempts (student_id, lesson_id, started_at DESC);
-- one open round per student and lesson
CREATE UNIQUE INDEX tutor_attempts_one_open_key ON public.tutor_attempts (student_id, lesson_id) WHERE status = 'in_progress';

-- 2. tutor_answers
CREATE TABLE public.tutor_answers (
  attempt_id  uuid NOT NULL REFERENCES public.tutor_attempts(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  chosen      text NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  seq         bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (attempt_id, question_id)
);

-- 3. RLS: read-only for clients, from day one
ALTER TABLE public.tutor_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_answers  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutor_attempts_select ON public.tutor_attempts
  FOR SELECT TO authenticated
  USING (student_id = (SELECT public.current_user_id()) OR public.is_instructor());

CREATE POLICY tutor_answers_select ON public.tutor_answers
  FOR SELECT TO authenticated
  USING (
    public.is_instructor()
    OR EXISTS (
      SELECT 1 FROM public.tutor_attempts a
      WHERE a.id = tutor_answers.attempt_id AND a.student_id = (SELECT public.current_user_id())
    )
  );

-- default ACLs hand new relations to anon/authenticated/service_role with everything: reset, then grant what is needed.
REVOKE ALL ON public.tutor_attempts, public.tutor_answers FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.tutor_attempts, public.tutor_answers TO authenticated;
GRANT ALL ON public.tutor_attempts, public.tutor_answers TO service_role;

-- 4. ordered answer save: insert, or overwrite ONLY when p_seq is newer than the stored seq (PostgREST cannot express
-- ON CONFLICT ... WHERE, hence a function). One atomic statement: two racing saves of the same question serialize on the
-- row and the higher seq always wins. Returns true when the answer was stored, false when a newer (or equal) one is there.
-- SECURITY INVOKER (default) and service_role only: the API passes the session identity, nothing here trusts a client.
CREATE FUNCTION public.tutor_answer_save(p_attempt uuid, p_question text, p_chosen text, p_seq bigint, p_answered_at timestamptz)
RETURNS boolean
LANGUAGE sql
AS $fn$
  WITH up AS (
    INSERT INTO public.tutor_answers AS t (attempt_id, question_id, chosen, answered_at, seq)
    VALUES (p_attempt, p_question, p_chosen, p_answered_at, p_seq)
    ON CONFLICT (attempt_id, question_id) DO UPDATE
      SET chosen = EXCLUDED.chosen, answered_at = EXCLUDED.answered_at, seq = EXCLUDED.seq
      WHERE t.seq < EXCLUDED.seq
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM up)
$fn$;
REVOKE ALL ON FUNCTION public.tutor_answer_save(uuid, text, text, bigint, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tutor_answer_save(uuid, text, text, bigint, timestamptz) TO service_role;

-- 4. ordered answer save: insert, or overwrite ONLY when p_seq is newer than the stored seq (PostgREST cannot express
-- ON CONFLICT ... WHERE, hence a function). One atomic statement: two racing saves of the same question serialize on the
-- row and the higher seq always wins. Returns true when the answer was stored, false when a newer (or equal) one is there.
-- SECURITY INVOKER (default) and service_role only: the API passes the session identity, nothing here trusts a client.
CREATE FUNCTION public.tutor_answer_save(p_attempt uuid, p_question text, p_chosen text, p_seq bigint, p_answered_at timestamptz)
RETURNS boolean
LANGUAGE sql
AS $fn$
  WITH up AS (
    INSERT INTO public.tutor_answers AS t (attempt_id, question_id, chosen, answered_at, seq)
    VALUES (p_attempt, p_question, p_chosen, p_answered_at, p_seq)
    ON CONFLICT (attempt_id, question_id) DO UPDATE
      SET chosen = EXCLUDED.chosen, answered_at = EXCLUDED.answered_at, seq = EXCLUDED.seq
      WHERE t.seq < EXCLUDED.seq
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM up)
$fn$;
REVOKE ALL ON FUNCTION public.tutor_answer_save(uuid, text, text, bigint, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tutor_answer_save(uuid, text, text, bigint, timestamptz) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Migration statements of 20261006030000_tutor_result.sql (under proof)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tutor_attempts
  ADD COLUMN result  jsonb,
  ADD COLUMN summary jsonb,
  ADD CONSTRAINT tutor_attempts_result_open_check
    CHECK (status <> 'in_progress' OR (result IS NULL AND summary IS NULL));

-- ===========================================================================
-- Fixtures (ids prefixed fx_). Everything rolls back at the end.
-- a001 student  in_progress (result must be NULL)         a002 student  submitted WITH result
-- a003 other    submitted WITH result                     a004 other    expired, no score, no result (pre-030000 shape)
-- a005 other    in_progress (negative control)
-- ===========================================================================
CREATE TEMP TABLE proof(step text, result text);
GRANT ALL ON proof TO anon, authenticated, service_role;

INSERT INTO public.users(id, name, role) VALUES
  ('fx_student',    'FX Student',    'student'),
  ('fx_other',      'FX Other',      'student'),
  ('fx_instructor', 'FX Instructor', 'instructor');
INSERT INTO public.courses_all(id, code, title, kind) VALUES ('fx_tutor', 'FX3', 'fixture tutor', 'tutor');
INSERT INTO public.lessons(id, course_id, title, status, index) VALUES ('fx_l1', 'fx_tutor', 'tutor lesson 1', 'active', 1);
INSERT INTO public.questions(id, lesson_id, kind, text, choices, answer) VALUES
  ('fx_q1', 'fx_l1', 'tutor', 'q1', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 'a'),
  ('fx_q2', 'fx_l1', 'tutor', 'q2', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 'b');

INSERT INTO public.tutor_attempts(id, student_id, lesson_id, question_ids, total, deadline_at, status, score, submitted_at, result) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'fx_student', 'fx_l1', ARRAY['fx_q1', 'fx_q2'], 2, now() + interval '2 minutes', 'in_progress', NULL, NULL, NULL),
  ('00000000-0000-0000-0000-00000000a002', 'fx_student', 'fx_l1', ARRAY['fx_q1', 'fx_q2'], 2, now() + interval '2 minutes', 'submitted', 1, now(),
   '{"version":1,"rows":[{"question_id":"fx_q1","chosen":"a","correct":true,"unanswered":false,"answer":"a","topic_id":null,"topic":null},{"question_id":"fx_q2","chosen":null,"correct":false,"unanswered":true,"answer":"b","topic_id":null,"topic":null}],"analysis":{}}'),
  ('00000000-0000-0000-0000-00000000a003', 'fx_other',   'fx_l1', ARRAY['fx_q1', 'fx_q2'], 2, now() + interval '2 minutes', 'submitted', 2, now(),
   '{"version":1,"rows":[{"question_id":"fx_q1","chosen":"a","correct":true,"unanswered":false,"answer":"a","topic_id":null,"topic":null},{"question_id":"fx_q2","chosen":"b","correct":true,"unanswered":false,"answer":"b","topic_id":null,"topic":null}],"analysis":{}}'),
  ('00000000-0000-0000-0000-00000000a004', 'fx_other',   'fx_l1', ARRAY['fx_q1', 'fx_q2'], 2, now() + interval '2 minutes', 'expired', NULL, now() + interval '2 minutes', NULL),
  ('00000000-0000-0000-0000-00000000a005', 'fx_other',   'fx_l1', ARRAY['fx_q1', 'fx_q2'], 2, now() + interval '2 minutes', 'in_progress', NULL, NULL, NULL);

INSERT INTO proof SELECT 'a1 result / summary are nullable jsonb columns',
  CASE WHEN (SELECT count(*) FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'tutor_attempts'
               AND column_name IN ('result', 'summary') AND data_type = 'jsonb' AND is_nullable = 'YES') = 2 THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'a2 grants on tutor_attempts unchanged: authenticated SELECT only, no anon',
  CASE WHEN (SELECT string_agg(grantee || ':' || privs, ' | ' ORDER BY grantee) FROM (
               SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) privs
               FROM information_schema.role_table_grants
               WHERE table_schema = 'public' AND table_name = 'tutor_attempts' AND grantee IN ('anon', 'authenticated') GROUP BY grantee) g)
          = 'authenticated:SELECT' THEN 'PASS' ELSE 'FAIL' END;

-- ===========================================================================
-- Student (fx_student): own attempts only; result NULL while running, readable once ended, never writable
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);

INSERT INTO proof SELECT 'b1 in_progress own attempt: result and summary are NULL (no answer key)',
  CASE WHEN (SELECT count(*) FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a001') = 1
        AND (SELECT result IS NULL AND summary IS NULL FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a001')
       THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b2 student reads the result of own ENDED attempt (answer snapshot included)',
  CASE WHEN (SELECT result->'rows'->1->>'answer' FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a002') = 'b'
        AND (SELECT result->'rows'->1->>'unanswered' FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a002') = 'true'
       THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b3 student sees own attempts only',
  CASE WHEN (SELECT array_agg(right(id::text, 4) ORDER BY id) FROM public.tutor_attempts WHERE lesson_id LIKE 'fx\_%')
          = ARRAY['a001', 'a002'] THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b4 student cannot read the other student result (no row, no result)',
  CASE WHEN NOT EXISTS (SELECT 1 FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a003')
        AND NOT EXISTS (SELECT 1 FROM public.tutor_attempts WHERE result IS NOT NULL AND student_id = 'fx_other')
       THEN 'PASS' ELSE 'FAIL' END;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET result = '{"forged":true}' WHERE id = '00000000-0000-0000-0000-00000000a002'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b5 student cannot write result of own ended attempt', 'FAIL: ' || n || ' rows');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b5 student cannot write result of own ended attempt', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET result = '{"forged":true}' WHERE id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b6 student cannot write result of own running attempt', 'FAIL: ' || n || ' rows');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b6 student cannot write result of own running attempt', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET summary = '{"forged":true}' WHERE id = '00000000-0000-0000-0000-00000000a002'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b7 student cannot write summary', 'FAIL: ' || n || ' rows');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b7 student cannot write summary', 'PASS: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at, status, score, submitted_at, result)
    VALUES ('fx_student', 'fx_l1', ARRAY['fx_q1'], 1, now() + interval '1 minute', 'submitted', 1, now(), '{"forged":true}');
  INSERT INTO proof VALUES ('b8 student cannot insert an attempt carrying a result', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b8 student cannot insert an attempt carrying a result', 'PASS: ' || SQLERRM); END $$;

-- the other student sees the mirror image
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_other","app_role":"student"}', true);
INSERT INTO proof SELECT 'b9 other student reads own ended result, not the first student one',
  CASE WHEN (SELECT result->'rows'->0->>'answer' FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a003') = 'a'
        AND NOT EXISTS (SELECT 1 FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a002')
       THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b10 other student: running attempt has NULL result',
  CASE WHEN (SELECT result IS NULL FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a005') THEN 'PASS' ELSE 'FAIL' END;

-- ===========================================================================
-- Defense in depth: even if the UPDATE grant came back, RLS (no write policy) still blocks result writes.
-- ===========================================================================
RESET ROLE;
GRANT UPDATE ON public.tutor_attempts TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET result = '{"forged":true}' WHERE id = '00000000-0000-0000-0000-00000000a002'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g1 with UPDATE grant back: RLS blocks student write of result', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g1 with UPDATE grant back: RLS blocks student write of result', 'FAIL: ' || SQLERRM); END $$;

RESET ROLE;
REVOKE UPDATE ON public.tutor_attempts FROM authenticated;

-- ===========================================================================
-- Anonymous: nothing at all
-- ===========================================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  PERFORM result FROM public.tutor_attempts;
  INSERT INTO proof VALUES ('c1 anon cannot read results', 'FAIL: readable');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c1 anon cannot read results', 'PASS: ' || SQLERRM); END $$;

-- ===========================================================================
-- Instructor: reads results, cannot write them
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_instructor","app_role":"instructor"}', true);
INSERT INTO proof SELECT 'd1 instructor reads the stored results',
  CASE WHEN (SELECT count(*) FROM public.tutor_attempts WHERE lesson_id LIKE 'fx\_%' AND result IS NOT NULL) = 2 THEN 'PASS' ELSE 'FAIL' END;
DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET result = '{"forged":true}' WHERE id = '00000000-0000-0000-0000-00000000a002'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('d2 instructor cannot write result (service role only)', 'FAIL: ' || n || ' rows');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('d2 instructor cannot write result (service role only)', 'PASS: ' || SQLERRM); END $$;

-- ===========================================================================
-- Service role (what settleAttempt uses)
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE service_role;

DO $$ BEGIN
  UPDATE public.tutor_attempts SET result = '{"version":1}' WHERE id = '00000000-0000-0000-0000-00000000a001';
  INSERT INTO proof VALUES ('e1 in_progress attempt with a result rejected (CHECK)', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e1 in_progress attempt with a result rejected (CHECK)', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e1 in_progress attempt with a result rejected (CHECK)', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.tutor_attempts SET summary = '{"text":"x"}' WHERE id = '00000000-0000-0000-0000-00000000a001';
  INSERT INTO proof VALUES ('e2 in_progress attempt with a summary rejected (CHECK)', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e2 in_progress attempt with a summary rejected (CHECK)', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e2 in_progress attempt with a summary rejected (CHECK)', 'FAIL: ' || SQLERRM); END $$;

-- settleAttempt: score + status + result in ONE conditional update; a second (racing) one matches nothing
DO $$ DECLARE n1 int; n2 int; BEGIN
  UPDATE public.tutor_attempts
     SET status = 'submitted', submitted_at = now(), score = 1,
         result = '{"version":1,"rows":[],"analysis":{}}'
   WHERE id = '00000000-0000-0000-0000-00000000a001' AND status = 'in_progress'; GET DIAGNOSTICS n1 = ROW_COUNT;
  UPDATE public.tutor_attempts
     SET status = 'submitted', submitted_at = now(), score = 2,
         result = '{"version":1,"rows":[],"analysis":{"loser":true}}'
   WHERE id = '00000000-0000-0000-0000-00000000a001' AND status = 'in_progress'; GET DIAGNOSTICS n2 = ROW_COUNT;
  INSERT INTO proof VALUES ('e3 settle update: first wins (1 row), racing second matches 0 rows and changes nothing',
    CASE WHEN n1 = 1 AND n2 = 0
          AND (SELECT score = 1 AND result->'analysis'->>'loser' IS NULL FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a001')
         THEN 'PASS' ELSE 'FAIL: ' || n1 || '/' || n2 END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e3 settle update: first wins (1 row), racing second matches 0 rows and changes nothing', 'FAIL: ' || SQLERRM); END $$;

-- backfill of a round that ended before `result` existed (a004: expired, score NULL, result NULL)
DO $$ DECLARE n1 int; n2 int; BEGIN
  UPDATE public.tutor_attempts SET score = 0, result = '{"version":1,"rows":[],"analysis":{}}'
   WHERE id = '00000000-0000-0000-0000-00000000a004' AND status <> 'in_progress' AND result IS NULL; GET DIAGNOSTICS n1 = ROW_COUNT;
  UPDATE public.tutor_attempts SET score = 1, result = '{"version":1,"rows":[],"analysis":{"loser":true}}'
   WHERE id = '00000000-0000-0000-0000-00000000a004' AND status <> 'in_progress' AND result IS NULL; GET DIAGNOSTICS n2 = ROW_COUNT;
  INSERT INTO proof VALUES ('e4 backfill of an ended round without a result: once (1 row), then 0 rows',
    CASE WHEN n1 = 1 AND n2 = 0 THEN 'PASS' ELSE 'FAIL: ' || n1 || '/' || n2 END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e4 backfill of an ended round without a result: once (1 row), then 0 rows', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.tutor_attempts SET status = 'in_progress', submitted_at = NULL, score = NULL WHERE id = '00000000-0000-0000-0000-00000000a002';
  INSERT INTO proof VALUES ('e5 re-opening an ended round that has a result rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e5 re-opening an ended round that has a result rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e5 re-opening an ended round that has a result rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET summary = '{"text":"AI summary"}' WHERE id = '00000000-0000-0000-0000-00000000a002' AND status <> 'in_progress'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('e6 ticket 06: summary can be stored once the round has ended', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e6 ticket 06: summary can be stored once the round has ended', 'FAIL: ' || SQLERRM); END $$;
RESET ROLE;

-- ===========================================================================
-- Negative controls
-- z1: switch RLS off and the student DOES read the other student's result: the policy is what hides it.
-- z2: drop the CHECK and a RUNNING attempt can carry the answer key to its student: the CHECK is what keeps it NULL.
-- ===========================================================================
ALTER TABLE public.tutor_attempts DISABLE ROW LEVEL SECURITY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);
INSERT INTO proof SELECT 'z1 CONTROL without RLS the student reads the other result',
  CASE WHEN EXISTS (SELECT 1 FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a003' AND result IS NOT NULL)
       THEN 'OK (leaks as expected)' ELSE 'UNEXPECTED: still hidden' END;
RESET ROLE;
ALTER TABLE public.tutor_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tutor_attempts DROP CONSTRAINT tutor_attempts_result_open_check;
UPDATE public.tutor_attempts SET result = '{"version":1,"rows":[{"answer":"leak"}]}' WHERE id = '00000000-0000-0000-0000-00000000a005';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_other","app_role":"student"}', true);
INSERT INTO proof SELECT 'z2 CONTROL without the CHECK a running attempt exposes its key to the student',
  CASE WHEN (SELECT result->'rows'->0->>'answer' FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a005') = 'leak'
       THEN 'OK (leaks as expected)' ELSE 'UNEXPECTED: still hidden' END;
RESET ROLE;

DO $$ BEGIN
  RAISE EXCEPTION E'PROOF RESULT\n%', (SELECT string_agg(step || ' => ' || result, E'\n' ORDER BY step) FROM proof);
END $$;
