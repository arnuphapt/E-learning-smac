-- Tutor mode for external (non-school) email domains: year levels get a domain, plus the tutor-only role row.
-- NOT APPLIED. Proof (self-aborting, rolls back): supabase/proofs/20261011040000_tutor_external_domains_proof.sql
--
-- ROLLOUT ORDER: apply this SQL BEFORE deploying the code of the same commit. The deployed pages select / filter
-- student_grades.domain (.eq("domain", ...)), which does not exist until this runs, so every student / instructor
-- page that loads year levels would fail. Existing rows keep working unchanged: they are backfilled to 'smnc.ac.th'.
-- Then, in the admin page "กำหนดชั้นปีนักศึกษา", add year levels for the external domain (this also inserts the domain into
-- allowed_domains; until a domain is in allowed_domains nobody can sign in with it).
--
-- What it does:
--   1. student_grades.domain text NOT NULL DEFAULT 'smnc.ac.th' (ADD COLUMN with a constant default: metadata only,
--      every existing row reads 'smnc.ac.th'). FK -> allowed_domains(domain) ON UPDATE CASCADE (a year level can only
--      belong to a domain that may sign in), lower-case check.
--   2. prefix is unique PER DOMAIN: new UNIQUE (domain, prefix) replaces UNIQUE (prefix). >>> This is the ONE DROP in the
--      forward path (DROP CONSTRAINT student_grades_prefix_key). No data is touched; the new constraint is strictly looser,
--      and it is added first inside the same transaction. It cannot be avoided: two domains must be able to use prefix '69'.
--      (The Supabase MCP declines DROP DDL: run this in the SQL Editor.)
--   3. student_grades.year_no integer: the LOCK KEY of an external domain's year level. courses.year_level is integer[]
--      (school years lock by their number, 1..5), so an external level needs an integer that can never equal a school
--      year or another domain's level. A trigger gives every external level a number >= 1000 from a sequence (all prefixes
--      of one label in one domain share it); school rows keep year_no NULL (unchanged: the app reads their number from
--      the label). A tutor set of an external domain is locked with year_level = {<year_no>} by the tutor settings page.
--      On a label edit: an existing level with the new label in that domain -> its key; the row was the LAST holder of
--      the old label -> keeps its key (renamed level, locks survive); other prefixes still hold the old label -> new key.
--   4. roles row 'tutor_guest' (no permissions): the role of an external-domain user. NOT staff: is_instructor() /
--      is_admin() match exact role ids (instructor, admin, course_manager), so they stay false for it.
--
-- WRITE ACCESS: allowed_domains and student_grades were writable by any staff (is_instructor(): instructor, course_manager,
--   admin). allowed_domains decides who may sign in, and (with this change) which domains exist as tutor-only, so both
--   *_all_instructor policies become is_admin() (USING and WITH CHECK). The *_select policies (public read) stay. The admin
--   page "กำหนดชั้นปีนักศึกษา" is under master:manage (admin) anyway. Apply order is unchanged.
-- RLS otherwise: NO policy change, on purpose. Every policy on the student-facing tables is either public, `authenticated`, or keyed
-- on current_user_id() / is_instructor(); none names the role 'student'. A 'tutor_guest' therefore sees exactly what a
-- student sees (courses_all kind='course', active lessons of kind='course', questions_student, own rows only), and
-- tutor sets / lessons / questions stay behind the service-role tutor API. users_guard still forbids it to change its
-- own role / email / id. The proof compares guest vs student and tries the writes. On top of that the app never mints a
-- Supabase JWT for it (/api/supabase-token answers 403), so it only holds the public anon key like any visitor.
-- (Existing, not changed here: several tables, e.g. courses / assignments / broadcasts / student_grades, are readable by
-- anon, so any visitor can read them. Out of scope.)
--
-- Inspected read-only on qsvwabaxqtbrxrwrqtih (2026-10-11): student_grades has 4 rows (66,67,68,69), PK id, UNIQUE (prefix),
-- no domain; allowed_domains has only 'smnc.ac.th' (PK domain); courses_all / broadcasts .year_level are integer[];
-- no non-smnc users; users.role has no CHECK / FK.

BEGIN;

-- 1. domain on the year levels (existing rows are backfilled to the default by the ADD COLUMN)
ALTER TABLE public.student_grades
  ADD COLUMN domain text NOT NULL DEFAULT 'smnc.ac.th';

ALTER TABLE public.student_grades
  ADD CONSTRAINT student_grades_domain_check CHECK (domain = lower(btrim(domain)) AND domain <> ''),
  ADD CONSTRAINT student_grades_domain_fkey FOREIGN KEY (domain) REFERENCES public.allowed_domains (domain) ON UPDATE CASCADE;

-- 2. prefix unique per domain (new constraint first, then the old one goes)
ALTER TABLE public.student_grades
  ADD CONSTRAINT student_grades_domain_prefix_key UNIQUE (domain, prefix);
ALTER TABLE public.student_grades
  DROP CONSTRAINT student_grades_prefix_key;

-- 3. year_no: lock key of an external year level (NULL for the school domain), handed out by a trigger
CREATE SEQUENCE public.student_grades_year_no_seq START 1000 MINVALUE 1000;
REVOKE ALL ON SEQUENCE public.student_grades_year_no_seq FROM PUBLIC, anon, authenticated;

ALTER TABLE public.student_grades ADD COLUMN year_no integer;
ALTER TABLE public.student_grades
  ADD CONSTRAINT student_grades_year_no_check
  CHECK (CASE WHEN domain = 'smnc.ac.th' THEN year_no IS NULL ELSE coalesce(year_no >= 1000, false) END);

-- SECURITY DEFINER only to use the sequence (revoked from the callers above); it reads and writes nothing else.
CREATE OR REPLACE FUNCTION public.student_grades_year_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $fn$
DECLARE
  v_same integer;
BEGIN
  IF NEW.domain = 'smnc.ac.th' THEN
    NEW.year_no := NULL;
    RETURN NEW;
  END IF;
  -- another prefix of the same label in the same domain is the same year level: share its key
  SELECT g.year_no INTO v_same
    FROM public.student_grades g
   WHERE g.domain = NEW.domain AND g.year_label = NEW.year_label AND g.id <> NEW.id AND g.year_no IS NOT NULL
   LIMIT 1;
  IF v_same IS NOT NULL THEN
    NEW.year_no := v_same;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.domain = NEW.domain AND OLD.year_no IS NOT NULL
       AND NOT (OLD.year_label <> NEW.year_label
                AND EXISTS (SELECT 1 FROM public.student_grades g
                             WHERE g.domain = OLD.domain AND g.year_label = OLD.year_label AND g.id <> NEW.id)) THEN
      -- a renamed level keeps its key, so the sets locked to it stay locked ...
      NEW.year_no := OLD.year_no;
    ELSE
      -- ... unless the row LEAVES a level that other prefixes still hold: it becomes a level of its own
      NEW.year_no := nextval('public.student_grades_year_no_seq');
    END IF;
  ELSE
    NEW.year_no := nextval('public.student_grades_year_no_seq');
  END IF;
  RETURN NEW;
END
$fn$;

REVOKE ALL ON FUNCTION public.student_grades_year_no() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER student_grades_year_no
  BEFORE INSERT OR UPDATE OF year_label, domain, year_no ON public.student_grades
  FOR EACH ROW EXECUTE FUNCTION public.student_grades_year_no();

-- 4. the tutor-only role (no permissions)
INSERT INTO public.roles (id, name, description, permissions)
VALUES ('tutor_guest', 'ผู้ใช้ภายนอก (ชุดติว)', 'Signed in from an external email domain: tutor mode only, never staff', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. who may change the domains / year levels: admins only (was: any staff)
ALTER POLICY allowed_domains_all_instructor ON public.allowed_domains
  USING (public.is_admin()) WITH CHECK (public.is_admin());
ALTER POLICY student_grades_all_instructor ON public.student_grades
  USING (public.is_admin()) WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ROLLBACK (manual, in this order; step 2 fails while two domains still share a prefix, step 1 deletes external year levels):
--
-- BEGIN;
-- ALTER POLICY allowed_domains_all_instructor ON public.allowed_domains USING (public.is_instructor()) WITH CHECK (public.is_instructor());
-- ALTER POLICY student_grades_all_instructor ON public.student_grades USING (public.is_instructor()) WITH CHECK (public.is_instructor());
-- DELETE FROM public.users WHERE role = 'tutor_guest';            -- their tutor_attempts / answers go with them? check FKs first;
--                                                                    or re-role them: UPDATE public.users SET role = 'student' ...
-- DELETE FROM public.roles WHERE id = 'tutor_guest';
-- DROP TRIGGER student_grades_year_no ON public.student_grades;
-- DROP FUNCTION public.student_grades_year_no();
-- DELETE FROM public.student_grades WHERE domain <> 'smnc.ac.th';  -- step 1
-- ALTER TABLE public.student_grades ADD CONSTRAINT student_grades_prefix_key UNIQUE (prefix);   -- step 2
-- ALTER TABLE public.student_grades DROP CONSTRAINT student_grades_domain_prefix_key;
-- ALTER TABLE public.student_grades DROP CONSTRAINT student_grades_domain_fkey;
-- ALTER TABLE public.student_grades DROP CONSTRAINT student_grades_domain_check;
-- ALTER TABLE public.student_grades DROP CONSTRAINT student_grades_year_no_check;
-- ALTER TABLE public.student_grades DROP COLUMN year_no;
-- ALTER TABLE public.student_grades DROP COLUMN domain;
-- DROP SEQUENCE public.student_grades_year_no_seq;
-- (sets locked to an external level hold a key >= 1000 in courses_all.year_level: clear them, they match nobody)
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
-- (Also roll the code back first: the old code does not know the role and would treat a 'tutor_guest' as a plain user.)
