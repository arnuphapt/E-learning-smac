-- Proof for supabase/migrations/20261006040000_ai_quota_claim.sql.
-- SELF-ABORTING: everything runs in one transaction that ends with RAISE EXCEPTION, so nothing persists.
-- Run it in the Supabase SQL Editor (or MCP execute_sql). The "error" it ends with IS the report:
--   ERROR: PROOF RESULT <one line per check: step => PASS | FAIL>
-- Expected: every a/b/c line starts with PASS.
-- 20261006010000, 20261006020000 and 20261006030000 may NOT be applied yet, so sections 1-3 repeat THEIR statements verbatim
-- (copied from the migration bodies, no BEGIN/COMMIT/NOTIFY) and section 4 is this migration's body verbatim. If they ARE
-- applied, delete the sections already applied or the CREATE TABLE / ADD COLUMN statements fail. Keep them in sync by hand.
-- (The migration itself only needs ai_chat_logs: where 010000-030000 are applied, run section 4 + the checks only.)
-- Fixtures use ids prefixed fx_. Checks run as service_role / authenticated / anon via SET LOCAL ROLE.
--
-- NOT provable inside one transaction: two sessions racing. Manual recipe (needs a real student id, then clean up):
--   session A: BEGIN; SELECT * FROM public.ai_quota_claim('<student>', 1, 'chat', NULL, NULL, NULL);   -- leave open
--   session B: SELECT * FROM public.ai_quota_claim('<student>', 1, 'chat', NULL, NULL, NULL);          -- BLOCKS on the advisory lock
--   session A: COMMIT;   -> session B unblocks and returns claim_id NULL (limit 1 already used). Then
--   DELETE FROM public.ai_chat_logs WHERE student_id = '<student>' AND reply = '' AND message = '';
-- What this file does prove: the lock is taken (b11), the window / modes / limit / cleanup / grants behave as specified.
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

-- ---------------------------------------------------------------------------
-- 3. Migration statements of 20261006030000_tutor_result.sql (prerequisite)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tutor_attempts
  ADD COLUMN result  jsonb,
  ADD COLUMN summary jsonb,
  ADD CONSTRAINT tutor_attempts_result_open_check
    CHECK (status <> 'in_progress' OR (result IS NULL AND summary IS NULL));

-- ---------------------------------------------------------------------------
-- 4. Migration statements of 20261006040000_ai_quota_claim.sql (under proof)
-- ---------------------------------------------------------------------------
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

-- ===========================================================================
-- Fixtures (ids prefixed fx_). Everything rolls back at the end.
-- ===========================================================================
CREATE TEMP TABLE proof(step text, result text);
GRANT ALL ON proof TO anon, authenticated, service_role;

INSERT INTO public.users(id, name, role) VALUES
  ('fx_student', 'FX Student',  'student'),
  ('fx_other',   'FX Other',    'student'),
  ('fx_edge',    'FX Edge',     'student'),
  ('fx_modes',   'FX Modes',    'student'),
  ('fx_stale',   'FX Stale',    'student'),
  ('fx_zero',    'FX Zero',     'student');
INSERT INTO public.courses_all(id, code, title) VALUES ('fx_c1', 'FX4', 'fixture course');
INSERT INTO public.lessons(id, course_id, title, status, index) VALUES ('fx_l1', 'fx_c1', 'lesson 1', 'active', 1);

-- Bangkok "today" start, computed the way the function does
CREATE TEMP TABLE fx_day AS SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok' AS day_start;
-- fx_edge: one row exactly at the start of today (counts), one a second before (yesterday, does not count)
INSERT INTO public.ai_chat_logs(student_id, message, reply, mode, created_at)
  SELECT 'fx_edge', 'm', 'r', 'chat', day_start FROM fx_day;
INSERT INTO public.ai_chat_logs(student_id, message, reply, mode, created_at)
  SELECT 'fx_edge', 'm', 'r', 'chat', day_start - interval '1 second' FROM fx_day;
-- fx_modes: a row with a mode the quota does not count
INSERT INTO public.ai_chat_logs(student_id, message, reply, mode) VALUES ('fx_modes', 'm', 'r', 'other');
-- fx_stale: a claim that was never released (11 min) and a fresh one (1 min)
INSERT INTO public.ai_chat_logs(student_id, message, reply, mode, created_at) VALUES
  ('fx_stale', '', '', 'chat', now() - interval '11 minutes'),
  ('fx_stale', '', '', 'chat', now() - interval '1 minute');

INSERT INTO proof SELECT 'a0 EXECUTE on ai_quota_claim: service_role only (PUBLIC / anon / authenticated revoked)',
  CASE WHEN has_function_privilege('service_role', 'public.ai_quota_claim(text, integer, text, text, text, text)', 'EXECUTE')
        AND NOT has_function_privilege('authenticated', 'public.ai_quota_claim(text, integer, text, text, text, text)', 'EXECUTE')
        AND NOT has_function_privilege('anon', 'public.ai_quota_claim(text, integer, text, text, text, text)', 'EXECUTE')
       THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'a1 SECURITY DEFINER with an empty search_path',
  CASE WHEN p.prosecdef AND p.proconfig @> ARRAY['search_path=""'] THEN 'PASS' ELSE 'FAIL: ' || p.prosecdef || ' ' || coalesce(p.proconfig::text, 'NULL') END
  FROM pg_proc p WHERE p.oid = 'public.ai_quota_claim(text, integer, text, text, text, text)'::regprocedure;

-- ===========================================================================
-- Service role (what the routes use)
-- ===========================================================================
CREATE TEMP TABLE r(k text, claim uuid, used int);
GRANT ALL ON r TO service_role;
SET LOCAL ROLE service_role;

INSERT INTO r SELECT 'c1', * FROM public.ai_quota_claim('fx_student', 3, 'chat',      'fx_l1', 'fx_c1', 'sess-1');
INSERT INTO r SELECT 'c2', * FROM public.ai_quota_claim('fx_student', 3, 'summarize', 'fx_l1', 'fx_c1', 'sess-1');
INSERT INTO r SELECT 'c3', * FROM public.ai_quota_claim('fx_student', 3, 'explain',   'fx_l1', 'fx_c1', 'tutor-x');
INSERT INTO r SELECT 'c4', * FROM public.ai_quota_claim('fx_student', 3, 'chat',      'fx_l1', 'fx_c1', 'sess-1');

INSERT INTO proof SELECT 'b1 first claim: id returned, used = 1, an empty placeholder row with the identity / lesson / mode / session',
  CASE WHEN r.claim IS NOT NULL AND r.used = 1
        AND (SELECT count(*) FROM public.ai_chat_logs l WHERE l.id = r.claim AND l.student_id = 'fx_student' AND l.message = '' AND l.reply = ''
               AND l.mode = 'chat' AND l.lesson_id = 'fx_l1' AND l.course_id = 'fx_c1' AND l.session_id = 'sess-1' AND l.hidden_by_student = false) = 1
       THEN 'PASS' ELSE 'FAIL' END FROM r WHERE k = 'c1';
INSERT INTO proof SELECT 'b2 claims 2 and 3 (summarize, explain) succeed with used 2 and 3',
  CASE WHEN (SELECT claim IS NOT NULL AND used = 2 FROM r WHERE k = 'c2') AND (SELECT claim IS NOT NULL AND used = 3 FROM r WHERE k = 'c3')
       THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b3 claim over the limit returns NULL, used = count, and inserts nothing',
  CASE WHEN (SELECT claim IS NULL AND used = 3 FROM r WHERE k = 'c4')
        AND (SELECT count(*) FROM public.ai_chat_logs WHERE student_id = 'fx_student') = 3
       THEN 'PASS' ELSE 'FAIL' END;

-- a filled row counts exactly like its claim did
UPDATE public.ai_chat_logs SET message = 'hi', reply = 'hello' WHERE id = (SELECT claim FROM r WHERE k = 'c1');
INSERT INTO proof SELECT 'b4 filling the claim (message + reply) does not change the count: still refused at the limit',
  CASE WHEN (SELECT claim IS NULL AND used = 3 FROM public.ai_quota_claim('fx_student', 3, 'chat', 'fx_l1', 'fx_c1', 's')) THEN 'PASS' ELSE 'FAIL' END;

-- releasing (delete) frees the slot
DELETE FROM public.ai_chat_logs WHERE id = (SELECT claim FROM r WHERE k = 'c3');
INSERT INTO proof SELECT 'b5 deleting a claim (failed Gemini call) frees the slot: next claim succeeds with used = 3',
  CASE WHEN (SELECT claim IS NOT NULL AND used = 3 FROM public.ai_quota_claim('fx_student', 3, 'chat', 'fx_l1', 'fx_c1', 's')) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'b6 another student has their own quota',
  CASE WHEN (SELECT claim IS NOT NULL AND used = 1 FROM public.ai_quota_claim('fx_other', 3, 'chat', NULL, NULL, NULL)) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'b7 Bangkok day window: the row at 00:00 counts, the row 1 second earlier does not (limit 1 refused, used = 1)',
  CASE WHEN (SELECT claim IS NULL AND used = 1 FROM public.ai_quota_claim('fx_edge', 1, 'chat', NULL, NULL, NULL)) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'b8 the yesterday row alone leaves room: limit 2 gives used = 2',
  CASE WHEN (SELECT claim IS NOT NULL AND used = 2 FROM public.ai_quota_claim('fx_edge', 2, 'chat', NULL, NULL, NULL)) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'b9 a row with a mode outside chat / summarize / explain is not counted',
  CASE WHEN (SELECT claim IS NOT NULL AND used = 1 FROM public.ai_quota_claim('fx_modes', 1, 'chat', NULL, NULL, NULL)) THEN 'PASS' ELSE 'FAIL' END;

-- stale cleanup: the 11-minute claim is deleted, the 1-minute claim stays and counts
INSERT INTO r SELECT 'stale', * FROM public.ai_quota_claim('fx_stale', 5, 'chat', NULL, NULL, NULL);
INSERT INTO proof SELECT 'b10 an unreleased claim older than 10 minutes is dropped, a fresh one counts (used = 2, 2 rows left)',
  CASE WHEN (SELECT used = 2 FROM r WHERE k = 'stale')
        AND (SELECT count(*) FROM public.ai_chat_logs WHERE student_id = 'fx_stale') = 2
        AND NOT EXISTS (SELECT 1 FROM public.ai_chat_logs WHERE student_id = 'fx_stale' AND created_at < now() - interval '10 minutes')
       THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'b11 the per-student advisory lock is held by this transaction after a claim',
  CASE WHEN EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid() AND granted) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'b12 limit 0 refuses at once (claim NULL, used 0)',
  CASE WHEN (SELECT claim IS NULL AND used = 0 FROM public.ai_quota_claim('fx_zero', 0, 'chat', NULL, NULL, NULL)) THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  PERFORM * FROM public.ai_quota_claim('fx_zero', 5, 'made-up', NULL, NULL, NULL);
  INSERT INTO proof VALUES ('b13 unknown mode rejected', 'FAIL: allowed');
EXCEPTION WHEN invalid_parameter_value THEN INSERT INTO proof VALUES ('b13 unknown mode rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('b13 unknown mode rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  PERFORM * FROM public.ai_quota_claim('', 5, 'chat', NULL, NULL, NULL);
  INSERT INTO proof VALUES ('b14 empty student rejected', 'FAIL: allowed');
EXCEPTION WHEN invalid_parameter_value THEN INSERT INTO proof VALUES ('b14 empty student rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('b14 empty student rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  PERFORM * FROM public.ai_quota_claim('nobody', 5, 'chat', NULL, NULL, NULL);
  INSERT INTO proof VALUES ('b15 unknown student rejected (FK)', 'FAIL: allowed');
EXCEPTION WHEN foreign_key_violation THEN INSERT INTO proof VALUES ('b15 unknown student rejected (FK)', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('b15 unknown student rejected (FK)', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  PERFORM * FROM public.ai_quota_claim('fx_zero', 5, 'chat', 'no_such_lesson', NULL, NULL);
  INSERT INTO proof VALUES ('b16 made-up lesson id rejected (FK): a bogus lessonContext cannot dodge the log', 'FAIL: allowed');
EXCEPTION WHEN foreign_key_violation THEN INSERT INTO proof VALUES ('b16 made-up lesson id rejected (FK): a bogus lessonContext cannot dodge the log', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('b16 made-up lesson id rejected (FK): a bogus lessonContext cannot dodge the log', 'FAIL: ' || SQLERRM); END $$;
RESET ROLE;

-- ===========================================================================
-- Signed-in students and anon cannot call it (it would let them spend or burn anyone's quota)
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);
DO $$ BEGIN
  PERFORM * FROM public.ai_quota_claim('fx_other', 5, 'chat', NULL, NULL, NULL);
  INSERT INTO proof VALUES ('c1 authenticated cannot call ai_quota_claim', 'FAIL: allowed');
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO proof VALUES ('c1 authenticated cannot call ai_quota_claim', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('c1 authenticated cannot call ai_quota_claim', 'FAIL: ' || SQLERRM); END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM * FROM public.ai_quota_claim('fx_other', 5, 'chat', NULL, NULL, NULL);
  INSERT INTO proof VALUES ('c2 anon cannot call ai_quota_claim', 'FAIL: allowed');
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO proof VALUES ('c2 anon cannot call ai_quota_claim', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('c2 anon cannot call ai_quota_claim', 'FAIL: ' || SQLERRM); END $$;
RESET ROLE;

DO $$ BEGIN
  RAISE EXCEPTION E'PROOF RESULT\n%', (SELECT string_agg(step || ' => ' || result, E'\n' ORDER BY step) FROM proof);
END $$;
