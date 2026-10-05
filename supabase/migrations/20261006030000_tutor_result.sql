-- Tutor mode, ticket 05: the result of an attempt is PERSISTED when the attempt ends.
-- APPLIED 2026-10-06 on qsvwabaxqtbrxrwrqtih. Proof (self-aborting, rolls back): supabase/proofs/20261006030000_tutor_result_proof.sql
-- Requires 20261006020000_tutor_attempts.sql (tutor_attempts) to be applied FIRST.
--
-- ROLLOUT ORDER: apply AFTER 20261006020000 and BEFORE deploying the code of the same commit: settleAttempt
-- (lib/tutor-server.js) now writes `result` together with `score`, and the result API reads `result` only.
--
-- What it does (no DROP statements in the forward path):
--   tutor_attempts.result  jsonb  written ONCE by the server in the same conditional UPDATE that sets score (settleAttempt).
--       { version, rows: [{ question_id, chosen, correct, unanswered, answer, topic_id, topic }], analysis: { ... } }
--       rows are the per-question outcome in the locked order, with snapshots of the correct answer id and the topic
--       (id + name) taken at settle time. analysis = per-topic percent / status and the "topics to review" list.
--       The review page reads ONLY this column, never the live answers or questions.topic_id, so the stored score
--       and the review always agree, and an answer that commits after the score was read is simply not in `result`.
--   tutor_attempts.summary jsonb  empty slot for the AI summary of ticket 06 (written once after the attempt ends).
--   CHECK tutor_attempts_result_open_check: while status = 'in_progress' both columns are NULL. tutor_attempts is
--       SELECT-able by the student (RLS: own rows), so this is what guarantees a student can never read the answer key
--       snapshot (result.rows[].answer) of a round that is still running. After the attempt ends the key IS readable
--       by its owner: that is intended (the review reveals after submit).
--   No policy / grant changes: the table already has SELECT-only for authenticated and no write path except the
--       service role (20261006020000). The new columns inherit that.
--   Existing ended rows keep result NULL; the API fills it the next time it touches them (settleAttempt treats
--       "ended and result IS NULL" as not settled yet).

BEGIN;

ALTER TABLE public.tutor_attempts
  ADD COLUMN result  jsonb,
  ADD COLUMN summary jsonb,
  ADD CONSTRAINT tutor_attempts_result_open_check
    CHECK (status <> 'in_progress' OR (result IS NULL AND summary IS NULL));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (the DROPs only exist here). Deletes every stored result and AI summary; scores stay.
-- ===========================================================================
-- BEGIN;
-- ALTER TABLE public.tutor_attempts
--   DROP CONSTRAINT tutor_attempts_result_open_check,
--   DROP COLUMN summary,
--   DROP COLUMN result;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
