-- Proof for supabase/migrations/20261006020000_tutor_attempts.sql.
-- SELF-ABORTING: everything runs in one transaction that ends with RAISE EXCEPTION, so nothing persists.
-- Run it in the Supabase SQL Editor (or MCP execute_sql). The "error" it ends with IS the report:
--   ERROR: PROOF RESULT <one line per check: step => PASS | FAIL | OK (control)>
-- Expected: every b/c/d/e/f/g/h line starts with PASS, every z (negative control) line says "OK (...)".
-- 20261006010000_tutor_bank.sql may NOT be applied yet, so section 1 repeats ITS statements verbatim (copied from the
-- migration body, no BEGIN/COMMIT/NOTIFY). If it IS applied, delete section 1 or the CREATE TABLE tutor_topics fails.
-- Section 2 is this migration's body verbatim. Keep both in sync by hand. Fixtures use ids prefixed fx_.
-- Checks run as student / other student / anon / instructor / service_role via SET LOCAL ROLE + request.jwt.claims.
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
-- 2. Migration statements of 20261006020000_tutor_attempts.sql
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


-- ===========================================================================
-- Fixtures (ids prefixed fx_). Everything rolls back at the end.
-- ===========================================================================
CREATE TEMP TABLE proof(step text, result text);
GRANT ALL ON proof TO anon, authenticated, service_role;

INSERT INTO public.users(id, name, role) VALUES
  ('fx_student',    'FX Student',    'student'),
  ('fx_other',      'FX Other',      'student'),
  ('fx_instructor', 'FX Instructor', 'instructor');
INSERT INTO public.courses_all(id, code, title, kind) VALUES ('fx_tutor', 'FX2', 'fixture tutor', 'tutor');
INSERT INTO public.lessons(id, course_id, title, status, index) VALUES
  ('fx_l1', 'fx_tutor', 'tutor lesson 1', 'active', 1),
  ('fx_l2', 'fx_tutor', 'tutor lesson 2', 'active', 2);
INSERT INTO public.questions(id, lesson_id, kind, text, choices, answer) VALUES
  ('fx_q1', 'fx_l1', 'tutor', 'q1', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 'a'),
  ('fx_q2', 'fx_l1', 'tutor', 'q2', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 'b'),
  ('fx_q3', 'fx_l1', 'tutor', 'q3', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 'a');
INSERT INTO public.tutor_attempts(id, student_id, lesson_id, question_ids, total, deadline_at) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'fx_student', 'fx_l1', ARRAY['fx_q2', 'fx_q1'], 2, now() + interval '2 minutes'),
  ('00000000-0000-0000-0000-00000000a002', 'fx_other',   'fx_l1', ARRAY['fx_q1', 'fx_q3'], 2, now() + interval '2 minutes');
INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'fx_q1', 'a'),
  ('00000000-0000-0000-0000-00000000a002', 'fx_q1', 'b');

INSERT INTO proof SELECT 'a0 grants tutor_attempts / tutor_answers',
  string_agg(table_name || ' ' || grantee || ':' || privs, ' | ' ORDER BY table_name, grantee) FROM (
    SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) privs
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name IN ('tutor_attempts', 'tutor_answers') GROUP BY table_name, grantee) g;

INSERT INTO proof SELECT 'a1 no per-answer correctness / answer key column on either table',
  CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name IN ('tutor_attempts', 'tutor_answers')
                          AND column_name IN ('correct', 'is_correct', 'answer'))
       THEN 'PASS' ELSE 'FAIL' END;

-- ===========================================================================
-- Student (fx_student): own rows only, no direct writes
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);

INSERT INTO proof SELECT 'b1 student reads own attempt only',
  CASE WHEN (SELECT array_agg(id::text ORDER BY id) FROM public.tutor_attempts WHERE lesson_id LIKE 'fx\_%')
          = ARRAY['00000000-0000-0000-0000-00000000a001'] THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b2 student cannot read the other student attempt by id',
  CASE WHEN NOT EXISTS (SELECT 1 FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a002') THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b3 student reads own answers only',
  CASE WHEN (SELECT array_agg(attempt_id::text || ':' || chosen) FROM public.tutor_answers WHERE question_id LIKE 'fx\_%')
          = ARRAY['00000000-0000-0000-0000-00000000a001:a'] THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b4 student still cannot read the question bank (answer key)',
  CASE WHEN (SELECT count(*) FROM public.questions WHERE id LIKE 'fx\_%') = 0 THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('b5 student insert own attempt blocked', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b5 student insert own attempt blocked', 'PASS: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_other', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('b6 student insert attempt for someone else blocked', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b6 student insert attempt for someone else blocked', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET status = 'submitted', score = 2, submitted_at = now()
    WHERE id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b7 student update own attempt (forge score)', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b7 student update own attempt (forge score)', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  DELETE FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b8 student delete own attempt', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b8 student delete own attempt', 'PASS: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-00000000a001', 'fx_q2', 'b');
  INSERT INTO proof VALUES ('b9 student insert answer into own attempt blocked', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b9 student insert answer into own attempt blocked', 'PASS: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-00000000a002', 'fx_q3', 'a');
  INSERT INTO proof VALUES ('b10 student insert answer into other attempt blocked', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b10 student insert answer into other attempt blocked', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_answers SET chosen = 'b' WHERE attempt_id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b11 student update own answer', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b11 student update own answer', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  DELETE FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b12 student delete own answer', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b12 student delete own answer', 'PASS: ' || SQLERRM); END $$;

-- the other student sees the mirror image
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_other","app_role":"student"}', true);
INSERT INTO proof SELECT 'b13 other student reads own attempt only',
  CASE WHEN (SELECT array_agg(id::text ORDER BY id) FROM public.tutor_attempts WHERE lesson_id LIKE 'fx\_%')
          = ARRAY['00000000-0000-0000-0000-00000000a002'] THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b14 other student reads own answers only',
  CASE WHEN (SELECT array_agg(attempt_id::text || ':' || chosen) FROM public.tutor_answers WHERE question_id LIKE 'fx\_%')
          = ARRAY['00000000-0000-0000-0000-00000000a002:b'] THEN 'PASS' ELSE 'FAIL' END;

-- a JWT with no sub sees nothing
SELECT set_config('request.jwt.claims', '{"role":"authenticated","app_role":"student"}', true);
INSERT INTO proof SELECT 'b15 authenticated without sub reads nothing',
  CASE WHEN (SELECT count(*) FROM public.tutor_attempts WHERE lesson_id LIKE 'fx\_%') = 0
        AND (SELECT count(*) FROM public.tutor_answers WHERE question_id LIKE 'fx\_%') = 0 THEN 'PASS' ELSE 'FAIL' END;

-- ===========================================================================
-- Defense in depth: even if the write GRANTs came back, RLS (no write policy) still blocks the student.
-- ===========================================================================
RESET ROLE;
GRANT INSERT, UPDATE, DELETE ON public.tutor_attempts, public.tutor_answers TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('g1 with grants back: RLS blocks student insert attempt', 'FAIL: allowed');
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO proof VALUES ('g1 with grants back: RLS blocks student insert attempt', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('g1 with grants back: RLS blocks student insert attempt', 'FAIL: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET status = 'submitted', score = 2, submitted_at = now()
    WHERE id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g2 with grants back: RLS blocks student update attempt', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g2 with grants back: RLS blocks student update attempt', 'FAIL: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  DELETE FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g3 with grants back: RLS blocks student delete attempt', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g3 with grants back: RLS blocks student delete attempt', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-00000000a001', 'fx_q2', 'b');
  INSERT INTO proof VALUES ('g4 with grants back: RLS blocks student insert answer', 'FAIL: allowed');
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO proof VALUES ('g4 with grants back: RLS blocks student insert answer', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('g4 with grants back: RLS blocks student insert answer', 'FAIL: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_answers SET chosen = 'b' WHERE attempt_id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g5 with grants back: RLS blocks student update answer', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g5 with grants back: RLS blocks student update answer', 'FAIL: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  DELETE FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('g6 with grants back: RLS blocks student delete answer', CASE WHEN n = 0 THEN 'PASS (0 rows)' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('g6 with grants back: RLS blocks student delete answer', 'FAIL: ' || SQLERRM); END $$;

RESET ROLE;
REVOKE INSERT, UPDATE, DELETE ON public.tutor_attempts, public.tutor_answers FROM authenticated;

-- ===========================================================================
-- Anonymous: nothing at all
-- ===========================================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

DO $$ BEGIN
  PERFORM 1 FROM public.tutor_attempts;
  INSERT INTO proof VALUES ('c1 anon select tutor_attempts denied', 'FAIL: readable');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c1 anon select tutor_attempts denied', 'PASS: ' || SQLERRM); END $$;
DO $$ BEGIN
  PERFORM 1 FROM public.tutor_answers;
  INSERT INTO proof VALUES ('c2 anon select tutor_answers denied', 'FAIL: readable');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c2 anon select tutor_answers denied', 'PASS: ' || SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('c3 anon insert attempt denied', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c3 anon insert attempt denied', 'PASS: ' || SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-00000000a001', 'fx_q2', 'b');
  INSERT INTO proof VALUES ('c4 anon insert answer denied', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c4 anon insert answer denied', 'PASS: ' || SQLERRM); END $$;

-- ===========================================================================
-- Instructor: reads everything, still cannot write
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_instructor","app_role":"instructor"}', true);

INSERT INTO proof SELECT 'd1 instructor reads all fixture attempts',
  CASE WHEN (SELECT count(*) FROM public.tutor_attempts WHERE lesson_id LIKE 'fx\_%') = 2 THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'd2 instructor reads all fixture answers',
  CASE WHEN (SELECT count(*) FROM public.tutor_answers WHERE question_id LIKE 'fx\_%') = 2 THEN 'PASS' ELSE 'FAIL' END;
DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('d3 instructor insert attempt denied (writes are service role only)', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('d3 instructor insert attempt denied (writes are service role only)', 'PASS: ' || SQLERRM); END $$;

-- ===========================================================================
-- Service role (what the tutor API uses): full access, constraints hold
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE service_role;

INSERT INTO proof SELECT 'e1 service_role reads both students attempts and answers',
  CASE WHEN (SELECT count(*) FROM public.tutor_attempts WHERE lesson_id LIKE 'fx\_%') = 2
        AND (SELECT count(*) FROM public.tutor_answers WHERE question_id LIKE 'fx\_%') = 2 THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l1', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('e2 second in_progress round for same student+lesson rejected', 'FAIL: allowed');
EXCEPTION WHEN unique_violation THEN INSERT INTO proof VALUES ('e2 second in_progress round for same student+lesson rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e2 second in_progress round for same student+lesson rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('e3 in_progress round for the same student on ANOTHER lesson allowed', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e3 in_progress round for the same student on ANOTHER lesson allowed', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l1', ARRAY['fx_q1', 'fx_q2'], 3, now() + interval '3 minutes');
  INSERT INTO proof VALUES ('e4 total <> cardinality(question_ids) rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e4 total <> cardinality(question_ids) rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e4 total <> cardinality(question_ids) rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at, status)
    VALUES ('fx_other', 'fx_l2', ARRAY[]::text[], 0, now() + interval '1 minute', 'in_progress');
  INSERT INTO proof VALUES ('e5 empty round rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e5 empty round rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e5 empty round rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at, status)
    VALUES ('fx_other', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute', 'paused');
  INSERT INTO proof VALUES ('e6 unknown status rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e6 unknown status rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e6 unknown status rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_other', 'fx_l2', ARRAY['fx_q1'], 1, now() - interval '1 minute');
  INSERT INTO proof VALUES ('e7 deadline before started_at rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e7 deadline before started_at rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e7 deadline before started_at rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('nobody', 'fx_l2', ARRAY['fx_q1'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('e8 unknown student rejected (FK)', 'FAIL: allowed');
EXCEPTION WHEN foreign_key_violation THEN INSERT INTO proof VALUES ('e8 unknown student rejected (FK)', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e8 unknown student rejected (FK)', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.tutor_attempts SET score = 1 WHERE id = '00000000-0000-0000-0000-00000000a001';
  INSERT INTO proof VALUES ('e9 in_progress round with a score rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e9 in_progress round with a score rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e9 in_progress round with a score rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.tutor_attempts SET status = 'submitted', submitted_at = now() WHERE id = '00000000-0000-0000-0000-00000000a001';
  INSERT INTO proof VALUES ('e10 submitted round without a score rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e10 submitted round without a score rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e10 submitted round without a score rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.tutor_attempts SET status = 'submitted', score = 3, submitted_at = now() WHERE id = '00000000-0000-0000-0000-00000000a001';
  INSERT INTO proof VALUES ('e11 score above total rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e11 score above total rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e11 score above total rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.tutor_attempts SET status = 'expired' WHERE id = '00000000-0000-0000-0000-00000000a001';
  INSERT INTO proof VALUES ('e12 expired round without submitted_at rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e12 expired round without submitted_at rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e12 expired round without submitted_at rejected', 'FAIL: ' || SQLERRM); END $$;

-- ticket 03 flips a past-deadline round to expired (no score yet); ticket 04 scores it later
DO $$ DECLARE n int; BEGIN
  UPDATE public.tutor_attempts SET status = 'expired', submitted_at = deadline_at
    WHERE id = '00000000-0000-0000-0000-00000000a001' AND status = 'in_progress'; GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.tutor_attempts SET score = 1 WHERE id = '00000000-0000-0000-0000-00000000a001';
  INSERT INTO proof VALUES ('e13 expired (score NULL) then scored by ticket 04', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e13 expired (score NULL) then scored by ticket 04', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_attempts(student_id, lesson_id, question_ids, total, deadline_at)
    VALUES ('fx_student', 'fx_l1', ARRAY['fx_q3'], 1, now() + interval '1 minute');
  INSERT INTO proof VALUES ('e14 a new round is allowed once the previous one ended', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e14 a new round is allowed once the previous one ended', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-00000000a001', 'fx_q1', 'b');
  INSERT INTO proof VALUES ('f1 second row for the same (attempt, question) rejected', 'FAIL: allowed');
EXCEPTION WHEN unique_violation THEN INSERT INTO proof VALUES ('f1 second row for the same (attempt, question) rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('f1 second row for the same (attempt, question) rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-00000000a001', 'fx_q1', 'b')
    ON CONFLICT (attempt_id, question_id) DO UPDATE SET chosen = EXCLUDED.chosen, answered_at = now();
  INSERT INTO proof SELECT 'f2 upsert changes the saved choice',
    CASE WHEN (SELECT chosen FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001' AND question_id = 'fx_q1') = 'b'
         THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f2 upsert changes the saved choice', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_answers(attempt_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-00000000ffff', 'fx_q1', 'a');
  INSERT INTO proof VALUES ('f3 answer for a missing attempt rejected (FK)', 'FAIL: allowed');
EXCEPTION WHEN foreign_key_violation THEN INSERT INTO proof VALUES ('f3 answer for a missing attempt rejected (FK)', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('f3 answer for a missing attempt rejected (FK)', 'FAIL: ' || SQLERRM); END $$;

-- ordered save (tutor_answer_save): an older seq can never overwrite a newer answer (aborted late request)
DO $$ DECLARE r boolean; c text; sq bigint; BEGIN
  r := public.tutor_answer_save('00000000-0000-0000-0000-00000000a001', 'fx_q1', 'a', 100, now());
  SELECT chosen, seq INTO c, sq FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001' AND question_id = 'fx_q1';
  INSERT INTO proof VALUES ('f5 newer seq applies (returns true, choice + seq stored)',
    CASE WHEN r IS TRUE AND c = 'a' AND sq = 100 THEN 'PASS' ELSE 'FAIL: returned ' || coalesce(r::text, 'NULL') || ', stored ' || coalesce(c, 'NULL') || '/' || coalesce(sq::text, 'NULL') END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f5 newer seq applies (returns true, choice + seq stored)', 'FAIL: ' || SQLERRM); END $$;
DO $$ DECLARE r boolean; c text; sq bigint; BEGIN
  r := public.tutor_answer_save('00000000-0000-0000-0000-00000000a001', 'fx_q1', 'b', 50, now());
  SELECT chosen, seq INTO c, sq FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001' AND question_id = 'fx_q1';
  INSERT INTO proof VALUES ('f6 OLDER seq ignored (returns false, stored answer untouched)',
    CASE WHEN r IS FALSE AND c = 'a' AND sq = 100 THEN 'PASS' ELSE 'FAIL: returned ' || coalesce(r::text, 'NULL') || ', stored ' || coalesce(c, 'NULL') || '/' || coalesce(sq::text, 'NULL') END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f6 OLDER seq ignored (returns false, stored answer untouched)', 'FAIL: ' || SQLERRM); END $$;
DO $$ DECLARE r boolean; c text; sq bigint; BEGIN
  r := public.tutor_answer_save('00000000-0000-0000-0000-00000000a001', 'fx_q1', 'b', 100, now());
  SELECT chosen, seq INTO c, sq FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001' AND question_id = 'fx_q1';
  INSERT INTO proof VALUES ('f7 EQUAL seq ignored (a retried request changes nothing)',
    CASE WHEN r IS FALSE AND c = 'a' AND sq = 100 THEN 'PASS' ELSE 'FAIL: returned ' || coalesce(r::text, 'NULL') || ', stored ' || coalesce(c, 'NULL') || '/' || coalesce(sq::text, 'NULL') END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f7 EQUAL seq ignored (a retried request changes nothing)', 'FAIL: ' || SQLERRM); END $$;
DO $$ DECLARE r boolean; c text; sq bigint; BEGIN
  r := public.tutor_answer_save('00000000-0000-0000-0000-00000000a001', 'fx_q2', 'b', 7, now());
  SELECT chosen, seq INTO c, sq FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001' AND question_id = 'fx_q2';
  INSERT INTO proof VALUES ('f8 insert-if-absent: first save for a question stores it',
    CASE WHEN r IS TRUE AND c = 'b' AND sq = 7 THEN 'PASS' ELSE 'FAIL: returned ' || coalesce(r::text, 'NULL') || ', stored ' || coalesce(c, 'NULL') || '/' || coalesce(sq::text, 'NULL') END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f8 insert-if-absent: first save for a question stores it', 'FAIL: ' || SQLERRM); END $$;
DO $$ DECLARE r boolean; c text; sq bigint; BEGIN
  r := public.tutor_answer_save('00000000-0000-0000-0000-00000000a001', 'fx_q1', 'b', 101, now());
  SELECT chosen, seq INTO c, sq FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a001' AND question_id = 'fx_q1';
  INSERT INTO proof VALUES ('f9 a later newer seq applies again',
    CASE WHEN r IS TRUE AND c = 'b' AND sq = 101 THEN 'PASS' ELSE 'FAIL: returned ' || coalesce(r::text, 'NULL') || ', stored ' || coalesce(c, 'NULL') || '/' || coalesce(sq::text, 'NULL') END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f9 a later newer seq applies again', 'FAIL: ' || SQLERRM); END $$;
INSERT INTO proof SELECT 'f10 tutor_answer_save executable by service_role only',
  CASE WHEN has_function_privilege('service_role', 'public.tutor_answer_save(uuid, text, text, bigint, timestamptz)', 'EXECUTE')
        AND NOT has_function_privilege('authenticated', 'public.tutor_answer_save(uuid, text, text, bigint, timestamptz)', 'EXECUTE')
        AND NOT has_function_privilege('anon', 'public.tutor_answer_save(uuid, text, text, bigint, timestamptz)', 'EXECUTE')
       THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  DELETE FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a002';
  INSERT INTO proof SELECT 'f4 deleting an attempt cascades to its answers',
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.tutor_answers WHERE attempt_id = '00000000-0000-0000-0000-00000000a002') THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f4 deleting an attempt cascades to its answers', 'FAIL: ' || SQLERRM); END $$;
RESET ROLE;

-- ===========================================================================
-- Negative control: switch RLS off and the student DOES read the other student's rows,
-- i.e. the policies (and nothing else) are what hide them. (fx_other's attempt was deleted by f4: add one back.)
-- ===========================================================================
INSERT INTO public.tutor_attempts(id, student_id, lesson_id, question_ids, total, deadline_at) VALUES
  ('00000000-0000-0000-0000-00000000a003', 'fx_other', 'fx_l1', ARRAY['fx_q1'], 1, now() + interval '2 minutes');
ALTER TABLE public.tutor_attempts DISABLE ROW LEVEL SECURITY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);
INSERT INTO proof SELECT 'z1 CONTROL without RLS the student reads the other attempt',
  CASE WHEN EXISTS (SELECT 1 FROM public.tutor_attempts WHERE id = '00000000-0000-0000-0000-00000000a003')
       THEN 'OK (leaks as expected)' ELSE 'UNEXPECTED: still hidden' END;
RESET ROLE;

DO $$ BEGIN
  RAISE EXCEPTION E'PROOF RESULT\n%', (SELECT string_agg(step || ' => ' || result, E'\n' ORDER BY step) FROM proof);
END $$;
