-- Proof for supabase/migrations/20261006010000_tutor_bank.sql.
-- SELF-ABORTING: everything runs in one transaction that ends with RAISE EXCEPTION, so nothing persists.
-- Run it in the Supabase SQL Editor (or MCP execute_sql). The "error" it ends with IS the report:
--   ERROR: PROOF RESULT <one line per check: step => PASS | FAIL | OK (control)>
-- Expected: every b/c/d/e/f/g line starts with PASS, every z (negative control) line says "OK (leaks as expected)".
-- Contains the migration statements verbatim (kept in sync by hand: if you edit one, edit the other), then fixtures
-- (ids prefixed fx_), then checks as student / anon / instructor / service_role via SET LOCAL ROLE +
-- request.jwt.claims (sub, app_role), then negative controls that restore the OLD policies/view.
BEGIN;

-- ---------------------------------------------------------------------------
-- Migration statements (from 20261006010000_tutor_bank.sql)
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


-- ===========================================================================
-- Fixtures (ids prefixed fx_). Everything rolls back at the end.
-- ===========================================================================
CREATE TEMP TABLE proof(step text, result text);
GRANT ALL ON proof TO anon, authenticated, service_role;

INSERT INTO public.courses_all(id, code, title, kind) VALUES
  ('fx_course', 'FX1', 'fixture course', 'course'),
  ('fx_tutor',  'FX2', 'fixture tutor',  'tutor');
INSERT INTO public.lessons(id, course_id, title, status, index) VALUES
  ('fx_l_course', 'fx_course', 'course lesson', 'active', 1),
  ('fx_l_tutor',  'fx_tutor',  'tutor lesson',  'active', 1),
  ('fx_l_orphan', NULL,        'orphan lesson', 'active', 1);
INSERT INTO public.assignments(id, course_id, lesson_id, title) VALUES
  ('fx_a_course', 'fx_course', 'fx_l_course', 'course assignment'),
  ('fx_a_tutor',  'fx_tutor',  'fx_l_tutor',  'tutor assignment'),
  ('fx_a_orphan', NULL,        NULL,          'orphan assignment');
INSERT INTO public.tutor_topics(id, lesson_id, name) VALUES
  ('fx_t_tutor',  'fx_l_tutor',  'Heart failure'),
  ('fx_t_course', 'fx_l_course', 'Other lesson topic');
INSERT INTO public.questions(id, lesson_id, kind, text, topic_id, explanation) VALUES
  ('fx_q_pre',          'fx_l_course', 'pre',   'plain pre question',               NULL,         NULL),
  ('fx_q_tutor',        'fx_l_tutor',  'tutor', 'tutor question in tutor lesson',   'fx_t_tutor', 'because'),
  ('fx_q_pre_in_tutor', 'fx_l_tutor',  'pre',   'pre question in a tutor lesson',   NULL,         NULL),
  ('fx_q_tutor_in_course', 'fx_l_course', 'tutor', 'tutor-kind question in a course lesson', NULL, NULL);

INSERT INTO proof SELECT '00 grants tutor_topics',
  string_agg(grantee || ':' || privs, ' | ' ORDER BY grantee) FROM (
    SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) privs
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'tutor_topics' GROUP BY grantee) g;

-- ===========================================================================
-- Student
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);

INSERT INTO proof SELECT 'b1 student questions_student: only the plain course question',
  CASE WHEN (SELECT array_agg(id ORDER BY id) FROM public.questions_student WHERE id LIKE 'fx\_%') = ARRAY['fx_q_pre']
       THEN 'PASS' ELSE 'FAIL: ' || coalesce((SELECT string_agg(id, ',' ORDER BY id) FROM public.questions_student WHERE id LIKE 'fx\_%'), 'none') END;

INSERT INTO proof SELECT 'b2 student questions base table: nothing',
  CASE WHEN (SELECT count(*) FROM public.questions WHERE id LIKE 'fx\_%') = 0 THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'b3 student lessons: course + orphan, not tutor',
  CASE WHEN (SELECT array_agg(id ORDER BY id) FROM public.lessons WHERE id LIKE 'fx\_%') = ARRAY['fx_l_course', 'fx_l_orphan']
       THEN 'PASS' ELSE 'FAIL: ' || coalesce((SELECT string_agg(id, ',' ORDER BY id) FROM public.lessons WHERE id LIKE 'fx\_%'), 'none') END;

INSERT INTO proof SELECT 'b4 student assignments: course + orphan, not tutor',
  CASE WHEN (SELECT array_agg(id ORDER BY id) FROM public.assignments WHERE id LIKE 'fx\_%') = ARRAY['fx_a_course', 'fx_a_orphan']
       THEN 'PASS' ELSE 'FAIL: ' || coalesce((SELECT string_agg(id, ',' ORDER BY id) FROM public.assignments WHERE id LIKE 'fx\_%'), 'none') END;

INSERT INTO proof SELECT 'b5 student cannot read the tutor lesson by id',
  CASE WHEN NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = 'fx_l_tutor') THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'b6 student tutor_topics: nothing',
  CASE WHEN (SELECT count(*) FROM public.tutor_topics WHERE id LIKE 'fx\_%') = 0 THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  INSERT INTO public.tutor_topics(id, lesson_id, name) VALUES ('fx_t_stud', 'fx_l_course', 'student topic');
  INSERT INTO proof VALUES ('b7 student insert topic blocked', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b7 student insert topic blocked', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.lessons SET tutor_draw_count = 5 WHERE id = 'fx_l_course'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b8 student update lessons.tutor_draw_count 0 rows', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b8 student update lessons.tutor_draw_count', 'PASS (error): ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.questions(id, lesson_id, kind, text) VALUES ('fx_q_stud', 'fx_l_tutor', 'tutor', 'student write');
  INSERT INTO proof VALUES ('b9 student insert question blocked', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b9 student insert question blocked', 'PASS: ' || SQLERRM); END $$;

-- ===========================================================================
-- Anonymous
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

INSERT INTO proof SELECT 'c1 anon lessons: nothing (no anon policy)',
  CASE WHEN (SELECT count(*) FROM public.lessons WHERE id LIKE 'fx\_%') = 0 THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'c2 anon assignments: course + orphan, not tutor',
  CASE WHEN (SELECT array_agg(id ORDER BY id) FROM public.assignments WHERE id LIKE 'fx\_%') = ARRAY['fx_a_course', 'fx_a_orphan']
       THEN 'PASS' ELSE 'FAIL: ' || coalesce((SELECT string_agg(id, ',' ORDER BY id) FROM public.assignments WHERE id LIKE 'fx\_%'), 'none') END;
DO $$ BEGIN
  PERFORM 1 FROM public.tutor_topics;
  INSERT INTO proof VALUES ('c3 anon tutor_topics denied', 'FAIL: readable');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c3 anon tutor_topics denied', 'PASS: ' || SQLERRM); END $$;
DO $$ BEGIN
  PERFORM 1 FROM public.questions_student;
  INSERT INTO proof VALUES ('c4 anon questions_student denied', 'FAIL: readable');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c4 anon questions_student denied', 'PASS: ' || SQLERRM); END $$;

-- ===========================================================================
-- Instructor
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_instructor","app_role":"instructor"}', true);

INSERT INTO proof SELECT 'd1 instructor sees all fixture lessons',
  CASE WHEN (SELECT count(*) FROM public.lessons WHERE id LIKE 'fx\_%') = 3 THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'd2 instructor sees all fixture assignments',
  CASE WHEN (SELECT count(*) FROM public.assignments WHERE id LIKE 'fx\_%') = 3 THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'd3 instructor sees all fixture questions (base table)',
  CASE WHEN (SELECT count(*) FROM public.questions WHERE id LIKE 'fx\_%') = 4 THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'd4 instructor sees both topics',
  CASE WHEN (SELECT count(*) FROM public.tutor_topics WHERE id LIKE 'fx\_%') = 2 THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'd5 instructor sees the tutor course in courses_all',
  CASE WHEN EXISTS (SELECT 1 FROM public.courses_all WHERE id = 'fx_tutor') THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  INSERT INTO public.tutor_topics(id, lesson_id, name) VALUES ('fx_t_new', 'fx_l_tutor', 'Arrhythmia');
  INSERT INTO proof VALUES ('d6 instructor insert topic', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('d6 instructor insert topic', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_topics(id, lesson_id, name) VALUES ('fx_t_dup', 'fx_l_tutor', '  heart FAILURE ');
  INSERT INTO proof VALUES ('d7 duplicate topic name (case/space) rejected', 'FAIL: allowed');
EXCEPTION WHEN unique_violation THEN INSERT INTO proof VALUES ('d7 duplicate topic name (case/space) rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('d7 duplicate topic name (case/space) rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_topics(id, lesson_id, name) VALUES ('fx_t_same', 'fx_l_course', 'Heart failure');
  INSERT INTO proof VALUES ('d8 same topic name in another lesson allowed', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('d8 same topic name in another lesson allowed', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.tutor_topics(id, lesson_id, name) VALUES ('fx_t_blank', 'fx_l_tutor', '   ');
  INSERT INTO proof VALUES ('d9 blank topic name rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('d9 blank topic name rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('d9 blank topic name rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.questions(id, lesson_id, kind, text, topic_id) VALUES ('fx_q_x', 'fx_l_tutor', 'tutor', 'cross-lesson topic', 'fx_t_course');
  INSERT INTO proof VALUES ('e1 question with a topic of another lesson rejected', 'FAIL: allowed');
EXCEPTION WHEN foreign_key_violation THEN INSERT INTO proof VALUES ('e1 question with a topic of another lesson rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e1 question with a topic of another lesson rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.questions(id, lesson_id, kind, text, topic_id, explanation) VALUES ('fx_q_ok', 'fx_l_tutor', 'tutor', 'good tutor question', 'fx_t_new', 'explained');
  INSERT INTO proof VALUES ('e2 tutor question with own-lesson topic + explanation', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e2 tutor question with own-lesson topic + explanation', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.questions(id, lesson_id, kind, text, explanation) VALUES ('fx_q_bad', 'fx_l_course', 'pre', 'pre with explanation', 'nope');
  INSERT INTO proof VALUES ('e3 explanation on a pre question rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('e3 explanation on a pre question rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('e3 explanation on a pre question rejected', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  DELETE FROM public.tutor_topics WHERE id = 'fx_t_tutor';
  INSERT INTO proof SELECT 'e4 deleting a topic nulls topic_id only (question and lesson_id stay)',
    CASE WHEN EXISTS (SELECT 1 FROM public.questions WHERE id = 'fx_q_tutor' AND topic_id IS NULL AND lesson_id = 'fx_l_tutor')
         THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('e4 delete topic', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.lessons SET tutor_draw_count = 5 WHERE id = 'fx_l_tutor';
  UPDATE public.lessons SET tutor_draw_count = NULL WHERE id = 'fx_l_tutor';
  INSERT INTO proof VALUES ('f1 instructor sets draw count 5 then NULL (whole bank)', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('f1 instructor sets draw count', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.lessons SET tutor_draw_count = 0 WHERE id = 'fx_l_tutor';
  INSERT INTO proof VALUES ('f2 draw count 0 rejected', 'FAIL: allowed');
EXCEPTION WHEN check_violation THEN INSERT INTO proof VALUES ('f2 draw count 0 rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('f2 draw count 0 rejected', 'FAIL: ' || SQLERRM); END $$;

-- ===========================================================================
-- Service role (what the tutor API uses): bypasses RLS, reads tutor rows and topics.
-- ===========================================================================
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO proof SELECT 'g1 service_role reads tutor lesson + question + topic',
  CASE WHEN EXISTS (SELECT 1 FROM public.lessons WHERE id = 'fx_l_tutor')
        AND EXISTS (SELECT 1 FROM public.questions WHERE id = 'fx_q_ok')
        AND EXISTS (SELECT 1 FROM public.tutor_topics WHERE id = 'fx_t_new') THEN 'PASS' ELSE 'FAIL' END;
RESET ROLE;

-- ===========================================================================
-- Negative controls: put the OLD definitions back and show the student DOES see the tutor rows,
-- i.e. the new definitions (and nothing else) are what hide them.
-- ===========================================================================
ALTER POLICY lessons_select ON public.lessons USING (status = 'active');
ALTER POLICY assignments_select ON public.assignments USING (true);
CREATE OR REPLACE VIEW public.questions_student AS
  SELECT q.id, q.no, q.type, q.text, q.choices, q.lesson_id, q.kind
  FROM public.questions q JOIN public.lessons l ON l.id = q.lesson_id WHERE l.status = 'active';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);
INSERT INTO proof SELECT 'z1 CONTROL old lessons policy leaks the tutor lesson',
  CASE WHEN EXISTS (SELECT 1 FROM public.lessons WHERE id = 'fx_l_tutor') THEN 'OK (leaks as expected)' ELSE 'UNEXPECTED: still hidden' END;
INSERT INTO proof SELECT 'z2 CONTROL old assignments policy leaks the tutor assignment',
  CASE WHEN EXISTS (SELECT 1 FROM public.assignments WHERE id = 'fx_a_tutor') THEN 'OK (leaks as expected)' ELSE 'UNEXPECTED: still hidden' END;
INSERT INTO proof SELECT 'z3 CONTROL old questions_student leaks tutor questions',
  CASE WHEN EXISTS (SELECT 1 FROM public.questions_student WHERE id = 'fx_q_tutor_in_course') THEN 'OK (leaks as expected)' ELSE 'UNEXPECTED: still hidden' END;
RESET ROLE;

DO $$ BEGIN
  RAISE EXCEPTION E'PROOF RESULT\n%', (SELECT string_agg(step || ' => ' || result, E'\n' ORDER BY step) FROM proof);
END $$;
