-- 1. questions_student: only questions of published ("active") lessons.
--    The view runs as its owner and bypasses RLS, so students could read draft lessons' question text.
--    Staff read/write the base table `questions` (questions_all_instructor) and are unaffected; the only
--    readers of the view are the student pages (lib/questions.js), and those never render draft lessons.
--    Same column list/order, so CREATE OR REPLACE keeps the view's grants (authenticated + service_role SELECT).
-- 2. ai_chat_logs.hidden_by_student: "clear chat history" becomes a soft-hide.
--    Students still have no UPDATE/DELETE policy on ai_chat_logs (deleting would reset the daily quota that
--    /api/ai/chat counts from this table). POST /api/ai/history/clear sets the flag with the service role.
--
-- ROLLOUT ORDER: run this SQL BEFORE deploying the code. The student chat pages filter on
-- hidden_by_student, so they fail to load history until the column exists.
-- Safe to run before deploy: the old code never reads the column, and the new column defaults to false.

CREATE OR REPLACE VIEW public.questions_student AS
  SELECT q.id, q.no, q.type, q.text, q.choices, q.lesson_id, q.kind
  FROM public.questions q
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE l.status = 'active';

ALTER TABLE public.ai_chat_logs
  ADD COLUMN IF NOT EXISTS hidden_by_student boolean NOT NULL DEFAULT false;

-- ===========================================================================
-- ROLLBACK (deploy the previous code first, then run):
-- ===========================================================================
-- ALTER TABLE public.ai_chat_logs DROP COLUMN IF EXISTS hidden_by_student;
--
-- CREATE OR REPLACE VIEW public.questions_student AS
--   SELECT id, no, type, text, choices, lesson_id, kind FROM public.questions;
