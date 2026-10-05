-- Tutor mode, ticket 03: attempts (one row per round) and answers, RLS on from day one.
-- APPLIED 2026-10-06 on qsvwabaxqtbrxrwrqtih. Proof (self-aborting, rolls back): supabase/proofs/20261006020000_tutor_attempts_proof.sql
-- Requires 20261006010000_tutor_bank.sql (questions.topic_id, lessons.tutor_draw_count) to be applied FIRST.
--
-- ROLLOUT ORDER: apply AFTER 20261006010000 and BEFORE deploying the code of the same commit: the tutor attempt
-- routes (/api/tutor/lessons/<id>/attempt) read and write these tables.
--
-- What it does (no DROP statements in the forward path):
--   1. tutor_attempts: one row per round of a student on a lesson.
--        question_ids text[]  the questions locked at start, in the order the student sees them (array order = exam
--                             order). Ids only, so it reveals nothing about answers. No FK possible on array elements.
--        total                = cardinality(question_ids) (CHECK), set at start so the exam size is on the row.
--        started_at / deadline_at  deadline_at = started_at + 1 minute per question, computed by the API (server clock).
--        status               in_progress | submitted | expired
--        score / submitted_at filled when the attempt ends (ticket 04). CHECKs:
--                               in_progress  -> score and submitted_at are NULL
--                               submitted    -> score and submitted_at are set
--                               expired      -> submitted_at set (= deadline_at when ticket 03 marks it); score MAY still
--                                              be NULL: ticket 03 only flips the status when it meets a past-deadline
--                                              round, ticket 04 scores any ended round whose score is NULL, counting
--                                              only answers with answered_at <= deadline_at.
--                             score between 0 and total.
--        Partial unique index: at most ONE in_progress round per (student, lesson), so a double-click on "start"
--        cannot create two rounds (the API re-reads the existing one on 23505).
--        Nothing the student can read here reveals an answer: no per-answer correctness, only ids and, after the
--        round ends, the total score. Topic analysis / AI summary columns belong to tickets 05 / 06.
--   2. tutor_answers: one row per (attempt, question) = the student's saved choice (PK attempt_id + question_id, so
--        changing an answer is an upsert). chosen = the choice id as sent; correctness is NOT stored (computed at
--        submit by the server from questions.answer), so nothing here discloses the key. question_id has no FK:
--        the API checks membership in tutor_attempts.question_ids, and a deleted bank question must not silently
--        delete a student's history.
--        seq bigint = a per-question client sequence number (the exam page sends a server-clock-based, strictly
--        increasing value). A save only applies when its seq is greater than the stored one, so a request that the
--        browser aborted (10 s timeout) but that still reaches the server late cannot overwrite a newer answer.
--        Written ONLY through tutor_answer_save() below (4.); the plain upsert is not used by the API.
--   3. RLS + grants. Students: SELECT only their own rows (student_id = current_user_id(); answers through their own
--        attempt). Staff (is_instructor()): SELECT everything. NO insert/update/delete policy for anyone, and the
--        write grants are revoked from anon/authenticated as well: every write is the service role in the tutor API,
--        with the identity taken from the session. anon has no grant at all.
--   4. tutor_answer_save(attempt, question, chosen, seq, answered_at) -> boolean: the ordered write the answer route
--        calls (insert, or update only when seq is newer). EXECUTE: service_role only.
--
-- Inspected read-only on qsvwabaxqtbrxrwrqtih (2026-10-06): users.id / lessons.id / questions.id are text PKs;
-- test_scores.student_id -> users(id) ON DELETE CASCADE is the same convention used here.

BEGIN;

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

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (the DROPs only exist here). Deletes every attempt and answer.
-- ===========================================================================
-- BEGIN;
-- DROP FUNCTION public.tutor_answer_save(uuid, text, text, bigint, timestamptz);
-- DROP TABLE public.tutor_answers;
-- DROP TABLE public.tutor_attempts;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
