-- Security hardening. APPLIED 2026-10-05.
-- MUST run AFTER 20261005000000_rls_jwt_claims.sql (RLS identity must already come from the signed JWT).
-- Prerequisites (see rollout order in the hand-off report):
--   * app code that uses SUPABASE_SERVICE_ROLE_KEY server-side is deployed (NextAuth callbacks, /api/tests/*),
--   * 20261005000000 is applied and verified.
-- DB roles: anon = no session, authenticated = signed-in (students AND instructors share it), service_role bypasses RLS.
-- Triggers below only restrict current_user IN ('anon','authenticated'); service_role / postgres / dashboard pass.

-- ===========================================================================
-- 1. Role helpers: exact matching on the comma-separated role list (was LIKE '%admin%').
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.is_instructor()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT COALESCE(
    string_to_array(replace(public.current_user_role(), ' ', ''), ',')
      && ARRAY['instructor', 'admin', 'course_manager'],
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT COALESCE(
    string_to_array(replace(public.current_user_role(), ' ', ''), ',') && ARRAY['admin'],
    false
  );
$function$;

-- ===========================================================================
-- 2. Narrow read paths for students (views run as their owner, so they bypass RLS on purpose;
--    they expose only the listed columns and are granted to `authenticated` only).
-- ===========================================================================
-- Questions WITHOUT the answer key (student test pages read this; grading happens in /api/tests/submit).
CREATE OR REPLACE VIEW public.questions_student AS
  SELECT id, no, type, text, choices, lesson_id, kind FROM public.questions;

-- Staff names for student pages (assignment page grader picker): no email / student_no, students excluded.
CREATE OR REPLACE VIEW public.user_directory AS
  SELECT id, name, role
  FROM public.users
  WHERE string_to_array(replace(role, ' ', ''), ',') && ARRAY['instructor', 'admin', 'course_manager'];

REVOKE ALL ON public.questions_student FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.questions_student TO authenticated, service_role;
GRANT SELECT ON public.user_directory TO authenticated, service_role;

-- ===========================================================================
-- 3. Table privileges: anon/authenticated must not TRUNCATE (bypasses RLS), REFERENCES or TRIGGER.
-- ===========================================================================
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ===========================================================================
-- 4. RLS on the three unprotected tables
-- ===========================================================================
-- roles: read only by the user-management pages (staff); the NextAuth callbacks read it with the service role.
-- Writes admin-only: permissions drive impersonation/user management, so they must not be self-editable.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_select_instructor ON public.roles
  FOR SELECT TO authenticated USING (public.is_instructor());
CREATE POLICY roles_write_admin ON public.roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- subject_group_managers: staff pages only (groups, users, course/new); callbacks use the service role.
ALTER TABLE public.subject_group_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY subject_group_managers_select_instructor ON public.subject_group_managers
  FOR SELECT TO authenticated USING (public.is_instructor());
CREATE POLICY subject_group_managers_write_instructor ON public.subject_group_managers
  FOR ALL TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- course_instructors: students read it (assignment page lists the course's graders); instructors write it.
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;
CREATE POLICY course_instructors_select ON public.course_instructors
  FOR SELECT TO authenticated USING (true);
CREATE POLICY course_instructors_write_instructor ON public.course_instructors
  FOR ALL TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- ===========================================================================
-- 5. users
-- ===========================================================================
-- Auto-registration now inserts via the service role. Staff still create users from /i/master/users.
DROP POLICY users_insert ON public.users;
CREATE POLICY users_insert_instructor ON public.users
  FOR INSERT TO authenticated WITH CHECK (public.is_instructor());

-- Own row, or staff (students no longer see each other's email / student_no).
DROP POLICY users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (((SELECT public.current_user_id()) = id) OR public.is_instructor());

CREATE OR REPLACE FUNCTION public.users_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- DELETE: staff may still delete users (the /i/master/users page), but never an admin account.
  IF TG_OP = 'DELETE' THEN
    IF current_user IN ('anon', 'authenticated') AND NOT public.is_admin()
       AND 'admin' = ANY (string_to_array(replace(coalesce(OLD.role, ''), ' ', ''), ',')) THEN
      RAISE EXCEPTION 'only an admin can delete an admin user' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF current_user NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF; -- service_role / postgres
  IF public.is_admin() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF 'admin' = ANY (string_to_array(replace(coalesce(NEW.role, ''), ' ', ''), ',')) THEN
      RAISE EXCEPTION 'only an admin can create an admin user' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: identity and privilege columns are admin-only (email is the Google login key).
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'id, role and email can only be changed by an admin' USING ERRCODE = '42501';
  END IF;
  -- Non-staff (a student editing their own profile): only name and student_no (what /s/profile writes).
  IF NOT public.is_instructor()
     AND (to_jsonb(NEW) - 'name' - 'student_no') IS DISTINCT FROM (to_jsonb(OLD) - 'name' - 'student_no') THEN
    RAISE EXCEPTION 'only name and student_no can be changed on your own profile' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER users_guard BEFORE INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_guard();

-- ===========================================================================
-- 6. submissions: students can submit/withdraw but never score or grade themselves.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.submissions_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_instructor() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'graded' THEN
      RAISE EXCEPTION 'a graded submission cannot be withdrawn' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'graded' THEN
    RAISE EXCEPTION 'a graded submission is read-only' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('submitted', 'not-submitted') THEN
    RAISE EXCEPTION 'invalid status for a student write' USING ERRCODE = '42501';
  END IF;
  -- score: may only be NULL (or stay as the instructor's draft score)
  IF NEW.score IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.score IS DISTINCT FROM OLD.score) THEN
    RAISE EXCEPTION 'score is set by the grader only' USING ERRCODE = '42501';
  END IF;
  -- total: must equal the assignment's points (the page sends a.points)
  IF NEW.total IS DISTINCT FROM (SELECT a.points FROM public.assignments a WHERE a.id = NEW.assignment_id) THEN
    RAISE EXCEPTION 'total must equal the assignment points' USING ERRCODE = '42501';
  END IF;
  -- grader_id: students pick their grader on submit, but it must be a staff user
  IF NEW.grader_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.user_directory d WHERE d.id = NEW.grader_id) THEN
    RAISE EXCEPTION 'grader must be a staff user' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER submissions_guard BEFORE INSERT OR UPDATE OR DELETE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_guard();

-- ===========================================================================
-- 7. test_scores: only the service-role route /api/tests/submit (or staff) writes scores.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.test_scores_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_instructor() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.pre IS NOT NULL OR NEW.post IS NOT NULL OR NEW.total IS NOT NULL
       OR NEW.pre_answers IS NOT NULL OR NEW.post_answers IS NOT NULL THEN
      RAISE EXCEPTION 'test scores are written by the server only' USING ERRCODE = '42501';
    END IF;
  ELSIF (NEW.pre, NEW.post, NEW.total, NEW.pre_answers, NEW.post_answers)
        IS DISTINCT FROM (OLD.pre, OLD.post, OLD.total, OLD.pre_answers, OLD.post_answers) THEN
    RAISE EXCEPTION 'test scores are written by the server only' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER test_scores_guard BEFORE INSERT OR UPDATE ON public.test_scores
  FOR EACH ROW EXECUTE FUNCTION public.test_scores_guard();

-- ===========================================================================
-- 8. questions.answer: students must not read it.
-- Chosen approach: restrict the base table to staff and give students the column-less view
-- questions_student (section 2). Instructor pages keep reading/writing `questions` unchanged
-- (no data copy, no new table, no instructor code change). Column privileges were not an option:
-- students and instructors share the `authenticated` DB role.
-- ===========================================================================
DROP POLICY questions_select ON public.questions; -- staff keep access via questions_all_instructor

-- ===========================================================================
-- 9. broadcasts: writes are staff-only (reads stay public to signed-in/anon as before).
-- ===========================================================================
DROP POLICY broadcasts_insert_auth ON public.broadcasts;
DROP POLICY broadcasts_update_auth ON public.broadcasts;
DROP POLICY broadcasts_delete_auth ON public.broadcasts;
CREATE POLICY broadcasts_insert_instructor ON public.broadcasts
  FOR INSERT TO authenticated WITH CHECK (public.is_instructor());
CREATE POLICY broadcasts_update_instructor ON public.broadcasts
  FOR UPDATE TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());
CREATE POLICY broadcasts_delete_instructor ON public.broadcasts
  FOR DELETE TO authenticated USING (public.is_instructor());

-- ===========================================================================
-- 10. ai_chat_logs: a user may only log as themselves (anon could forge rows and exhaust a victim's
--     daily quota, which /api/ai/chat counts from this table). The chat route inserts with the user's
--     Bearer JWT (supabaseAuthHeaders), so sub = student_id and legitimate logging keeps working.
-- ===========================================================================
DROP POLICY "Allow anon and authenticated to insert" ON public.ai_chat_logs;
CREATE POLICY ai_chat_logs_insert_own ON public.ai_chat_logs
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_user_id()) = student_id);

-- ===========================================================================
-- 11. reminder_sent_logs: nothing in the app, no pg_cron job and no edge function touches it
--     (last row 2026-06-23). Drop the public policies: RLS stays on with no policy, so only
--     service_role / postgres can read or write it. An external writer using the anon key would break.
-- ===========================================================================
DROP POLICY "Allow public insert" ON public.reminder_sent_logs;
DROP POLICY "Allow public select" ON public.reminder_sent_logs;

-- ===========================================================================
-- 12. lessons: no anonymous read; students only see published ("active") lessons.
--     Staff keep full access through lessons_all_instructor (ALL, is_instructor()).
-- ===========================================================================
DROP POLICY lessons_select ON public.lessons;
CREATE POLICY lessons_select ON public.lessons
  FOR SELECT TO authenticated USING (status = 'active');

-- ===========================================================================
-- ROLLBACK (originals taken verbatim from pg_policies / pg_get_functiondef / information_schema before this change).
-- Run top to bottom.
-- ===========================================================================
--
-- -- 12. lessons
-- DROP POLICY lessons_select ON public.lessons;
-- CREATE POLICY lessons_select ON public.lessons FOR SELECT TO public USING (true);
--
-- -- 11. reminder_sent_logs
-- CREATE POLICY "Allow public insert" ON public.reminder_sent_logs FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "Allow public select" ON public.reminder_sent_logs FOR SELECT TO public USING (true);
--
-- -- 10. ai_chat_logs
-- DROP POLICY ai_chat_logs_insert_own ON public.ai_chat_logs;
-- CREATE POLICY "Allow anon and authenticated to insert" ON public.ai_chat_logs FOR INSERT TO public WITH CHECK (true);
--
-- -- 9. broadcasts
-- DROP POLICY broadcasts_insert_instructor ON public.broadcasts;
-- DROP POLICY broadcasts_update_instructor ON public.broadcasts;
-- DROP POLICY broadcasts_delete_instructor ON public.broadcasts;
-- CREATE POLICY broadcasts_insert_auth ON public.broadcasts FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY broadcasts_update_auth ON public.broadcasts FOR UPDATE TO public USING (true);
-- CREATE POLICY broadcasts_delete_auth ON public.broadcasts FOR DELETE TO public USING (true);
--
-- -- 8. questions
-- CREATE POLICY questions_select ON public.questions FOR SELECT TO public USING (true);
--
-- -- 7. test_scores
-- DROP TRIGGER test_scores_guard ON public.test_scores;
-- DROP FUNCTION public.test_scores_guard();
--
-- -- 6. submissions
-- DROP TRIGGER submissions_guard ON public.submissions;
-- DROP FUNCTION public.submissions_guard();
--
-- -- 5. users
-- DROP TRIGGER users_guard ON public.users;
-- DROP FUNCTION public.users_guard();
-- DROP POLICY users_select ON public.users;
-- DROP POLICY users_insert_instructor ON public.users;
-- CREATE POLICY users_select ON public.users FOR SELECT TO public USING (true);
-- CREATE POLICY users_insert ON public.users FOR INSERT TO public WITH CHECK (true);
--
-- -- 4. RLS on roles / subject_group_managers / course_instructors (originally disabled, no policies)
-- DROP POLICY course_instructors_write_instructor ON public.course_instructors;
-- DROP POLICY course_instructors_select ON public.course_instructors;
-- ALTER TABLE public.course_instructors DISABLE ROW LEVEL SECURITY;
-- DROP POLICY subject_group_managers_write_instructor ON public.subject_group_managers;
-- DROP POLICY subject_group_managers_select_instructor ON public.subject_group_managers;
-- ALTER TABLE public.subject_group_managers DISABLE ROW LEVEL SECURITY;
-- DROP POLICY roles_write_admin ON public.roles;
-- DROP POLICY roles_select_instructor ON public.roles;
-- ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
--
-- -- 2. views (dropped before the grant below, which would otherwise also touch them)
-- DROP VIEW public.user_directory;
-- DROP VIEW public.questions_student;
--
-- -- 3. table privileges (anon and authenticated both had DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on every table)
-- GRANT TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO anon, authenticated;
--
-- -- 1. role helpers (is_admin did not exist; drop it only after nothing references it, i.e. after the policies above)
-- CREATE OR REPLACE FUNCTION public.is_instructor()
--  RETURNS boolean
--  LANGUAGE sql
--  SECURITY DEFINER
-- AS $function$
--   SELECT COALESCE(
--     public.current_user_role() LIKE '%instructor%'
--     OR public.current_user_role() LIKE '%admin%'
--     OR public.current_user_role() LIKE '%course_manager%',
--     false
--   );
-- $function$;
-- DROP FUNCTION public.is_admin();
