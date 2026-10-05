-- RLS identity from the server-minted JWT instead of browser-supplied x-user-* headers.
-- APPLIED 2026-10-05. Prerequisites (met): the code that sends the Bearer token (/api/supabase-token) is deployed,
-- SUPABASE_JWT_SECRET is set in Vercel, and the legacy JWT secret is still accepted by the project.
--
-- JWT shape (see lib/supabase-token.js): role='authenticated', sub=<app users.id (text)>, app_role=<users.role>.
-- All policies target {public}, so they apply to both anon and authenticated: no policy changes needed.
-- is_instructor() is unchanged (reads current_user_role()).

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT NULLIF(auth.jwt() ->> 'sub', '');
$function$;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT NULLIF(auth.jwt() ->> 'app_role', '');
$function$;

-- ROLLBACK (original definitions, verbatim from pg_get_functiondef before this change):
--
-- CREATE OR REPLACE FUNCTION public.current_user_id()
--  RETURNS text
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
-- AS $function$
--   SELECT NULLIF(current_setting('request.headers', true)::json->>'x-user-id', '');
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.current_user_role()
--  RETURNS text
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
-- AS $function$
--   SELECT NULLIF(current_setting('request.headers', true)::json->>'x-user-role', '');
-- $function$;
