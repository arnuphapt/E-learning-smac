-- Proof for supabase/migrations/20261011040000_tutor_external_domains.sql.
-- SELF-ABORTING: everything runs in one transaction that ends with RAISE EXCEPTION, so nothing persists.
-- Run it in the Supabase SQL Editor (NOT the MCP: the migration body contains a DROP CONSTRAINT). The "error" it ends with IS the report:
--   ERROR: PROOF RESULT <one line per check: step => PASS | FAIL>
-- Expected: every line starts with PASS.
-- Contains the migration statements verbatim (kept in sync by hand: if you edit one, edit the other), so run it BEFORE the
-- migration is applied. If the migration IS applied, delete section 1 (ADD COLUMN / constraints / trigger would fail).
-- Fixtures use ids / domains prefixed fx. Checks run as service_role / authenticated via SET LOCAL ROLE + request.jwt.claims.
BEGIN;

CREATE TEMP TABLE proof(step text, result text);
GRANT ALL ON proof TO anon, authenticated, service_role;
CREATE TEMP TABLE snap(who text, what text, ids text);
GRANT ALL ON snap TO anon, authenticated, service_role;

-- what existed before the migration (to prove the backfill)
CREATE TEMP TABLE before_grades AS SELECT id, prefix, year_label FROM public.student_grades;

-- ---------------------------------------------------------------------------
-- 1. Migration statements (from 20261011040000_tutor_external_domains.sql, without BEGIN / COMMIT / NOTIFY)
-- ---------------------------------------------------------------------------
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

-- ===========================================================================
-- Fixtures
-- ===========================================================================
INSERT INTO public.allowed_domains(domain) VALUES ('fx-partner.test'), ('fx-other.test');
INSERT INTO public.users(id, name, email, role, student_no) VALUES
  ('fx_student', 'fx student', '66010001@smnc.ac.th',        'student',     '66010001'),
  ('fx_guest',   'fx guest',   '69010001@fx-partner.test',   'tutor_guest', '69010001'),
  ('fx_staff',   'fx staff',   'fx_staff@smnc.ac.th',        'instructor',  NULL),
  ('fx_admin',   'fx admin',   'fx_admin@smnc.ac.th',        'admin',       NULL);
INSERT INTO public.courses_all(id, code, title, kind) VALUES
  ('fx_course', 'FX1', 'fixture course', 'course'),
  ('fx_tutor',  'FX2', 'fixture tutor',  'tutor');
INSERT INTO public.lessons(id, course_id, title, status, index) VALUES
  ('fx_l_course', 'fx_course', 'course lesson', 'active', 1),
  ('fx_l_tutor',  'fx_tutor',  'tutor lesson',  'active', 1);
INSERT INTO public.assignments(id, course_id, lesson_id, title) VALUES
  ('fx_a_course', 'fx_course', 'fx_l_course', 'course assignment'),
  ('fx_a_tutor',  'fx_tutor',  'fx_l_tutor',  'tutor assignment');
INSERT INTO public.tutor_topics(id, lesson_id, name) VALUES ('fx_t_tutor', 'fx_l_tutor', 'Heart failure');
INSERT INTO public.questions(id, lesson_id, kind, text, topic_id) VALUES
  ('fx_q_pre',   'fx_l_course', 'pre',   'plain pre question', NULL),
  ('fx_q_tutor', 'fx_l_tutor',  'tutor', 'tutor question',     'fx_t_tutor');

-- ===========================================================================
-- a. year levels: backfill, per-domain prefix, label guard (as the service role / postgres)
-- ===========================================================================
INSERT INTO proof SELECT 'a1 every pre-existing year level is backfilled to smnc.ac.th, same prefix and label',
  CASE WHEN (SELECT count(*) FROM before_grades) = (SELECT count(*) FROM public.student_grades g JOIN before_grades b USING (id)
              WHERE g.domain = 'smnc.ac.th' AND g.prefix = b.prefix AND g.year_label = b.year_label)
        AND (SELECT count(*) FROM public.student_grades WHERE id NOT IN (SELECT id FROM before_grades)) = 0
       THEN 'PASS (' || (SELECT count(*) FROM before_grades) || ' rows)' ELSE 'FAIL' END;

INSERT INTO public.student_grades(id, prefix, year_label) VALUES ('fx_sg_default', '99', 'fx ปี default');
INSERT INTO proof SELECT 'a2 a new row without a domain gets smnc.ac.th',
  CASE WHEN (SELECT domain FROM public.student_grades WHERE id = 'fx_sg_default') = 'smnc.ac.th' THEN 'PASS' ELSE 'FAIL' END;

DO $$ BEGIN
  INSERT INTO public.student_grades(id, prefix, year_label, domain) VALUES
    ('fx_sg_p1', '99', 'ชั้นปีที่ 1', 'fx-partner.test'),   -- same prefix as the school row 99, same label as the school's year 1
    ('fx_sg_p2', '98', 'ชั้นปีที่ 1', 'fx-partner.test'),   -- second prefix of the same level
    ('fx_sg_p3', '97', 'ชั้นปีที่ 2', 'fx-partner.test'),
    ('fx_sg_o1', '99', 'ชั้นปีที่ 1', 'fx-other.test');     -- another domain: same prefix, same label
  INSERT INTO proof VALUES ('a3 same prefix / same label allowed in another domain', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('a3 same prefix / same label allowed in another domain', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.student_grades(id, prefix, year_label, domain) VALUES ('fx_sg_dup', '99', 'ชั้นปีที่ 3', 'fx-partner.test');
  INSERT INTO proof VALUES ('a4 same prefix twice in one domain rejected', 'FAIL: allowed');
EXCEPTION WHEN unique_violation THEN INSERT INTO proof VALUES ('a4 same prefix twice in one domain rejected', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('a4 same prefix twice in one domain rejected', 'FAIL: ' || SQLERRM); END $$;

INSERT INTO proof SELECT 'a5 school rows (old and new) have no year_no; external rows get a key >= 1000',
  CASE WHEN (SELECT count(*) FROM public.student_grades WHERE domain = 'smnc.ac.th' AND year_no IS NOT NULL) = 0
        AND (SELECT count(*) FROM public.student_grades WHERE domain <> 'smnc.ac.th' AND (year_no IS NULL OR year_no < 1000)) = 0
       THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO proof SELECT 'a6 one level of a domain = one key; other level / other domain = other key',
  CASE WHEN (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p1') = (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p2')
        AND (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p1') <> (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p3')
        AND (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p1') <> (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_o1')
       THEN 'PASS' ELSE 'FAIL: ' || (SELECT string_agg(id || '=' || coalesce(year_no::text, 'null'), ', ' ORDER BY id) FROM public.student_grades WHERE id LIKE 'fx\_sg\_%') END;

DO $$ DECLARE k integer; BEGIN
  UPDATE public.student_grades SET year_label = 'ชั้นปีที่ 1 (renamed)' WHERE id = 'fx_sg_p3';
  SELECT year_no INTO k FROM public.student_grades WHERE id = 'fx_sg_p3';
  UPDATE public.student_grades SET year_label = 'ชั้นปีที่ 2' WHERE id = 'fx_sg_p3';
  INSERT INTO proof VALUES ('a6b renaming a level keeps its key (sets locked to it stay locked)',
    CASE WHEN k = (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p3') THEN 'PASS' ELSE 'FAIL' END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('a6b renaming a level keeps its key', 'FAIL: ' || SQLERRM); END $$;

DO $$ DECLARE k1 integer; k2 integer; BEGIN
  -- p1 and p2 share a level in fx-partner.test: renaming p2 away must NOT drag its key along
  SELECT year_no INTO k1 FROM public.student_grades WHERE id = 'fx_sg_p1';
  UPDATE public.student_grades SET year_label = 'ชั้นปีที่ 5' WHERE id = 'fx_sg_p2';
  SELECT year_no INTO k2 FROM public.student_grades WHERE id = 'fx_sg_p2';
  INSERT INTO proof VALUES ('a6d renaming one of two prefixes of a level gives it a NEW key; the other keeps the old one',
    CASE WHEN k2 <> k1 AND k2 >= 1000 AND (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p1') = k1 THEN 'PASS' ELSE 'FAIL' END);
  -- renaming it onto an existing label of the domain adopts that level's key
  UPDATE public.student_grades SET year_label = 'ชั้นปีที่ 1' WHERE id = 'fx_sg_p2';
  INSERT INTO proof VALUES ('a6e renaming onto an existing label adopts that level key',
    CASE WHEN (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p2') = k1 THEN 'PASS' ELSE 'FAIL' END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('a6d/e rename of a shared level', 'FAIL: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.student_grades SET year_no = 1 WHERE id = 'fx_sg_p3';
  INSERT INTO proof VALUES ('a6c a hand-set year_no is overridden by the trigger (no collision with a school year)',
    CASE WHEN (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_p3') >= 1000 THEN 'PASS' ELSE 'FAIL' END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('a6c a hand-set year_no is overridden by the trigger', 'PASS (error): ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.student_grades(id, prefix, year_label, domain) VALUES ('fx_sg_nodom', '96', 'ชั้นปีที่ 1', 'fx-not-allowed.test');
  INSERT INTO proof VALUES ('a7 a domain that may not sign in cannot own year levels', 'FAIL: allowed');
EXCEPTION WHEN foreign_key_violation THEN INSERT INTO proof VALUES ('a7 a domain that may not sign in cannot own year levels', 'PASS: ' || SQLERRM);
          WHEN OTHERS THEN INSERT INTO proof VALUES ('a7 a domain that may not sign in cannot own year levels', 'FAIL: ' || SQLERRM); END $$;

INSERT INTO proof SELECT 'a8 role tutor_guest exists with no permissions',
  CASE WHEN (SELECT permissions FROM public.roles WHERE id = 'tutor_guest') = '[]'::jsonb THEN 'PASS' ELSE 'FAIL' END;

-- ===========================================================================
-- b. what a student sees vs what a tutor_guest sees (the same queries, snapshotted per role)
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_student","app_role":"student"}', true);
INSERT INTO snap SELECT 'student', 'courses_all',     coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.courses_all WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'courses',         coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.courses WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'lessons',         coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.lessons WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'assignments',     coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.assignments WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'questions_student', coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.questions_student WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'questions',       coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.questions WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'tutor_topics',    coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.tutor_topics WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'users',           coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.users WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'student', 'is_instructor',   public.is_instructor()::text;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_guest","app_role":"tutor_guest"}', true);
INSERT INTO snap SELECT 'guest', 'courses_all',     coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.courses_all WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'courses',         coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.courses WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'lessons',         coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.lessons WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'assignments',     coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.assignments WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'questions_student', coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.questions_student WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'questions',       coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.questions WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'tutor_topics',    coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.tutor_topics WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'users',           coalesce(string_agg(id, ',' ORDER BY id), '') FROM public.users WHERE id LIKE 'fx\_%';
INSERT INTO snap SELECT 'guest', 'is_instructor',   public.is_instructor()::text;
INSERT INTO snap SELECT 'guest', 'is_admin',        public.is_admin()::text;

DO $$ BEGIN
  INSERT INTO public.courses_all(id, code, title, kind) VALUES ('fx_c_guest', 'FX9', 'guest course', 'course');
  INSERT INTO proof VALUES ('b3 guest insert course blocked', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b3 guest insert course blocked', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  UPDATE public.lessons SET title = 'hacked' WHERE id = 'fx_l_course'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('b4 guest update lesson 0 rows', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b4 guest update lesson', 'PASS (error): ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.users SET role = 'instructor' WHERE id = 'fx_guest';
  INSERT INTO proof VALUES ('b5 guest cannot make itself instructor', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b5 guest cannot make itself instructor', 'PASS: ' || SQLERRM); END $$;

DO $$ BEGIN
  UPDATE public.users SET email = '66010009@smnc.ac.th' WHERE id = 'fx_guest';
  INSERT INTO proof VALUES ('b6 guest cannot change its email', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b6 guest cannot change its email', 'PASS: ' || SQLERRM); END $$;

DO $$ DECLARE n int; BEGIN
  INSERT INTO public.student_grades(id, prefix, year_label, domain) VALUES ('fx_sg_guest', '95', 'ชั้นปีที่ 9', 'fx-partner.test');
  INSERT INTO proof VALUES ('b7 guest cannot write year levels', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b7 guest cannot write year levels', 'PASS: ' || SQLERRM); END $$;

DO $$ BEGIN
  INSERT INTO public.users(id, name, email, role) VALUES ('fx_guest2', 'x', 'x@fx-partner.test', 'instructor');
  INSERT INTO proof VALUES ('b8 guest cannot create an instructor user', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('b8 guest cannot create an instructor user', 'PASS: ' || SQLERRM); END $$;
RESET ROLE;

INSERT INTO proof SELECT 'b1 guest sees exactly what a student sees, except own user row (' || count(*) || ' queries compared)',
  CASE WHEN count(*) > 0 AND NOT EXISTS (
         SELECT 1 FROM snap s JOIN snap g ON g.what = s.what AND g.who = 'guest'
          WHERE s.who = 'student' AND s.what <> 'users' AND s.ids IS DISTINCT FROM g.ids)
       THEN 'PASS' ELSE 'FAIL: ' || coalesce((SELECT string_agg(s.what || ' student=[' || s.ids || '] guest=[' || g.ids || ']', '; ')
               FROM snap s JOIN snap g ON g.what = s.what AND g.who = 'guest' WHERE s.who = 'student' AND s.what <> 'users' AND s.ids IS DISTINCT FROM g.ids), 'no rows') END
FROM snap WHERE who = 'guest' AND what NOT IN ('is_admin', 'users');

INSERT INTO proof SELECT 'b2 guest: normal course + lesson only, no tutor rows, own user row only, not instructor, not admin',
  CASE WHEN (SELECT ids FROM snap WHERE who = 'guest' AND what = 'courses_all') = 'fx_course'
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'lessons') = 'fx_l_course'
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'assignments') = 'fx_a_course'
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'questions_student') = 'fx_q_pre'
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'questions') = ''
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'tutor_topics') = ''
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'users') = 'fx_guest'
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'is_instructor') = 'false'
        AND (SELECT ids FROM snap WHERE who = 'guest' AND what = 'is_admin') = 'false'
       THEN 'PASS' ELSE 'FAIL: ' || (SELECT string_agg(what || '=[' || ids || ']', '; ') FROM snap WHERE who = 'guest') END;

-- ===========================================================================
-- c. domains / year levels are writable by admins only (instructors and course managers can still READ them)
-- ===========================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_staff","app_role":"instructor"}', true);
INSERT INTO proof SELECT 'c1 instructor still sees tutor + normal fixture lessons and is_instructor()',
  CASE WHEN (SELECT count(*) FROM public.lessons WHERE id LIKE 'fx\_%') = 2 AND public.is_instructor() THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO proof SELECT 'c1b instructor can still READ allowed_domains and student_grades',
  CASE WHEN (SELECT count(*) FROM public.allowed_domains) >= 3 AND (SELECT count(*) FROM public.student_grades) >= 4 THEN 'PASS' ELSE 'FAIL' END;
DO $$ BEGIN
  INSERT INTO public.student_grades(id, prefix, year_label, domain) VALUES ('fx_sg_staff', '94', 'ชั้นปีที่ 7', 'fx-other.test');
  INSERT INTO proof VALUES ('c2 instructor cannot insert a year level', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c2 instructor cannot insert a year level', 'PASS: ' || SQLERRM); END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE public.student_grades SET year_label = 'hacked' WHERE id = 'fx_sg_p1'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('c3 instructor cannot update a year level (0 rows)', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c3 instructor cannot update a year level', 'PASS (error): ' || SQLERRM); END $$;
DO $$ DECLARE n int; BEGIN
  DELETE FROM public.student_grades WHERE id = 'fx_sg_p1'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('c4 instructor cannot delete a year level (0 rows)', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c4 instructor cannot delete a year level', 'PASS (error): ' || SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO public.allowed_domains(domain) VALUES ('fx-staff-added.test');
  INSERT INTO proof VALUES ('c5 instructor cannot allow a new domain', 'FAIL: allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c5 instructor cannot allow a new domain', 'PASS: ' || SQLERRM); END $$;
DO $$ DECLARE n int; BEGIN
  DELETE FROM public.allowed_domains WHERE domain = 'fx-other.test'; GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO proof VALUES ('c6 instructor cannot remove a domain (0 rows)', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL: ' || n END);
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c6 instructor cannot remove a domain', 'PASS (error): ' || SQLERRM); END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"fx_admin","app_role":"admin"}', true);
DO $$ BEGIN
  INSERT INTO public.allowed_domains(domain) VALUES ('fx-admin-added.test');
  INSERT INTO public.student_grades(id, prefix, year_label, domain) VALUES ('fx_sg_admin', '93', 'ชั้นปีที่ 8', 'fx-admin-added.test');
  UPDATE public.student_grades SET year_label = 'ชั้นปีที่ 8 (แก้)' WHERE id = 'fx_sg_admin';
  INSERT INTO proof SELECT 'c7 admin can add a domain, add and edit a year level (key assigned)',
    CASE WHEN (SELECT year_no FROM public.student_grades WHERE id = 'fx_sg_admin') >= 1000 THEN 'PASS' ELSE 'FAIL' END;
  DELETE FROM public.student_grades WHERE id = 'fx_sg_admin';
  DELETE FROM public.allowed_domains WHERE domain = 'fx-admin-added.test';
  INSERT INTO proof VALUES ('c8 admin can delete them again', 'PASS');
EXCEPTION WHEN OTHERS THEN INSERT INTO proof VALUES ('c7/c8 admin write access', 'FAIL: ' || SQLERRM); END $$;
RESET ROLE;

DO $$ BEGIN
  RAISE EXCEPTION E'PROOF RESULT\n%', (SELECT string_agg(step || ' => ' || result, E'\n' ORDER BY step) FROM proof);
END $$;
