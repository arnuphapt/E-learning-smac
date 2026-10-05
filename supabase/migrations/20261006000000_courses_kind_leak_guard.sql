-- Tutor mode, ticket 01: keep tutor sets out of every existing `courses` read.
-- APPLIED 2026-10-06 on qsvwabaxqtbrxrwrqtih after a rolled-back fixture proof (write through the view,
-- RLS as caller, tutor rows hidden from non-staff on courses_all).
--
-- What it does:
--   1. courses.kind text NOT NULL DEFAULT 'course' CHECK (kind IN ('course','tutor')); existing rows become 'course'.
--   2. Renames the real table to courses_all. Its PK, indexes, RLS flag, policies (courses_all_instructor,
--      courses_select) and table grants move with it; the 4 FKs (lessons, assignments, course_instructors,
--      ai_chat_logs -> courses(id), all ON DELETE CASCADE) follow the rename automatically.
--   3. Creates view public.courses = courses_all WHERE kind = 'course'.
--        security_invoker = true  -> RLS of courses_all is evaluated as the CALLER (without it the view runs as its
--                                    owner, postgres, and bypasses RLS).
--        WITH CHECK OPTION        -> an INSERT/UPDATE through the view cannot produce a non-'course' row.
--      The view is simple (single table, no aggregates) so it is auto-updatable: existing
--      insert/update/delete/upsert calls on `courses` keep working for kind = 'course' rows.
--   4. Re-grants the view to anon / authenticated / service_role exactly like the old table
--      (anon, authenticated: SELECT, INSERT, UPDATE, DELETE; service_role: everything).
--
-- Inspected read-only on qsvwabaxqtbrxrwrqtih (2026-10-06): no sequences, no triggers, no other views, no functions,
-- no policies on other tables and no publications reference `courses` by name; owner postgres.
-- The view selects `*` at creation time: columns added to courses_all later do NOT appear in the view.

BEGIN;

ALTER TABLE public.courses
  ADD COLUMN kind text NOT NULL DEFAULT 'course'
  CONSTRAINT courses_kind_check CHECK (kind IN ('course', 'tutor'));

ALTER TABLE public.courses RENAME TO courses_all;

CREATE VIEW public.courses
  WITH (security_invoker = true)
  AS SELECT * FROM public.courses_all WHERE kind = 'course'
  WITH CHECK OPTION;

-- default ACLs hand new relations to anon/authenticated/service_role with everything: reset, then match the old table.
REVOKE ALL ON public.courses FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO anon, authenticated;
GRANT ALL ON public.courses TO service_role;

-- courses_select was USING (true): non-staff could read tutor rows by querying courses_all directly.
-- Staff still read everything through courses_all_instructor (ALL, is_instructor()); students reach tutor sets
-- only through the service-role tutor routes.
ALTER POLICY courses_select ON public.courses_all USING (kind = 'course');

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (run top to bottom). Tutor rows MUST be handled first: after step 2 they would become plain courses
-- visible to students. Either delete them or move them somewhere else:
--   DELETE FROM public.courses_all WHERE kind = 'tutor';   -- cascades to their lessons / assignments / ai_chat_logs
-- ===========================================================================
-- BEGIN;
-- ALTER POLICY courses_select ON public.courses_all USING (true);
-- DROP VIEW public.courses;
-- ALTER TABLE public.courses_all RENAME TO courses;
-- ALTER TABLE public.courses DROP CONSTRAINT courses_kind_check;
-- ALTER TABLE public.courses DROP COLUMN kind;
-- -- the table keeps its original grants and policies; nothing else to restore
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
