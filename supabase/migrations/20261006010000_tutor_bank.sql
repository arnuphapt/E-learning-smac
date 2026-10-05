-- Tutor mode, ticket 02: per-lesson question bank + topics, and keep tutor lessons/assignments away from students.
-- APPLIED 2026-10-06 on qsvwabaxqtbrxrwrqtih. Proof (self-aborting, rolls back): supabase/proofs/20261006010000_tutor_bank_proof.sql
-- Requires 20261006000000_courses_kind_leak_guard.sql (courses_all / courses.kind) to be applied.
--
-- ROLLOUT ORDER: apply this SQL BEFORE deploying the code of the same commit. The tutor pages select
-- lessons.tutor_draw_count / questions.topic_id, which do not exist until this runs.
-- Until it IS applied, lessons / assignments / questions_student do not look at the course kind, so tutor rows are
-- exposed to students through the old paths: do NOT create tutor courses, lessons, questions or fixtures before apply.
--
-- What it does (no DROP statements in the forward path):
--   1. tutor_topics: free-text topics per lesson, reused across the lesson's questions.
--        id text PK, lesson_id -> lessons ON DELETE CASCADE, name; one name per lesson (case/space-insensitive).
--        RLS on from day one: staff (is_instructor()) full access, no student/anon policy. Students get topic names
--        only through the service-role tutor API. Table grants: authenticated CRUD (RLS decides), service_role all, anon none.
--   2. questions: tutor support.
--        kind = 'tutor' (kind is free text: pre / post / tutor), no schema change needed for the value itself.
--        topic_id    -> the question's topic. Composite FK (topic_id, lesson_id) -> tutor_topics(id, lesson_id) so a
--                       question can only point at a topic of its OWN lesson; deleting a topic nulls topic_id only.
--        explanation -> the teacher's explanation of the answer (shown to students only after submit, by the tutor API).
--        CHECK: topic_id / explanation are only allowed on kind = 'tutor' rows.
--   3. lessons.tutor_draw_count (integer, NULL = "use the whole bank", else > 0): questions drawn per attempt.
--        Placed on lessons (not a new table) because spec says the bank and its setting are per lesson.
--        Students read lessons with an explicit column list (STUDENT_LESSON_COLUMNS), so this column is not exposed
--        to them by existing pages; it is not sensitive anyway.
--   4. questions_student view: also excludes kind = 'tutor' and any lesson of a tutor course (view runs as owner,
--      so the check reads courses_all unfiltered). Same columns -> CREATE OR REPLACE keeps its grants.
--   5. Carry-over from ticket 01 review: lessons_select / assignments_select did not look at the course kind, so a
--      student could read tutor lessons and assignments through /s/assignments, /s/calendar, /s/lesson/<id>.
--      Both policies now require the parent course to be kind = 'course' (a row with a NULL course_id keeps its old
--      visibility; there are none today). The EXISTS must be the positive form: courses_all RLS already hides tutor
--      rows from students, so "NOT EXISTS tutor" would be true for them. Staff are unaffected
--      (lessons_all_instructor / assignments_all_instructor are ALL, is_instructor()).
--
-- Inspected read-only on qsvwabaxqtbrxrwrqtih (2026-10-06, PostgreSQL 17.6): questions.kind has no CHECK and only
-- 'pre'/'post' rows; no lessons or assignments with NULL course_id; no tutor courses yet; questions.lesson_id has no FK.

BEGIN;

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

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (run top to bottom; the DROPs only exist here). Tutor questions / topics are deleted with their columns.
-- If tutor courses exist by then, rolling back steps 4-5 re-opens their lessons/assignments to students:
-- delete them first (DELETE FROM public.courses_all WHERE kind = 'tutor'; cascades) or do not roll back 4-5.
-- ===========================================================================
-- BEGIN;
-- ALTER POLICY assignments_select ON public.assignments USING (true);  -- original, verified on pg_policies 2026-10-06 (roles {public})
-- ALTER POLICY lessons_select ON public.lessons USING (status = 'active');
-- CREATE OR REPLACE VIEW public.questions_student AS
--   SELECT q.id, q.no, q.type, q.text, q.choices, q.lesson_id, q.kind
--   FROM public.questions q
--   JOIN public.lessons l ON l.id = q.lesson_id
--   WHERE l.status = 'active';
-- ALTER TABLE public.lessons DROP COLUMN tutor_draw_count;
-- DELETE FROM public.questions WHERE kind = 'tutor';
-- ALTER TABLE public.questions DROP CONSTRAINT questions_tutor_fields_check;
-- ALTER TABLE public.questions DROP CONSTRAINT questions_topic_fk;
-- ALTER TABLE public.questions DROP COLUMN explanation, DROP COLUMN topic_id;
-- DROP TABLE public.tutor_topics;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
