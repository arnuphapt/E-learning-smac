-- Live Quiz (ควิซสดแบบ Kahoot), ticket 01 run A.
-- Written for Dice to run manually in the Supabase SQL Editor.
--
-- What it does:
--   1. Tables (9 relations):
--        - live_quizzes: instructor quiz sets (owner_id -> users, title).
--        - live_quiz_questions: ordered questions with choices (2-4), single answer, time limit (5..120s).
--        - live_sessions: game rooms with PIN, course_id (-> courses_all), host_id, snapshot metadata,
--                         phase check, and active partial unique index on PIN.
--        - live_session_questions: immutable question snapshot locked at session creation (server-only).
--        - live_teams: permanent course teams (color_no 1..8, unique per course).
--        - live_players: players joined into a session, mapped to a team or solo.
--        - live_answers: single-answer submissions per (session, question_idx, user) with server-scored points (0..1000).
--        - live_team_members: course team roster (1 team per user per course).
--        - live_team_results: permanent team XP results written when a team session ends.
--   2. RLS & Permissions:
--        - RLS enabled across all 9 tables from day one.
--        - live_quizzes & live_quiz_questions: instructor owner-only for all operations.
--        - live_sessions: SELECT for host or joined players.
--        - live_players: SELECT for session host or player themselves.
--        - live_answers: SELECT for session host only (players read feedback via API).
--        - live_session_questions, live_teams, live_team_members, live_team_results:
--          no SELECT/writes for authenticated/anon clients (service_role only).
--        - Default ACLs revoked from PUBLIC, anon, authenticated, service_role,
--          then minimal SELECT/write granted to authenticated, ALL to service_role.
--   3. Supabase Realtime:
--        - Publication supabase_realtime extended with live_sessions, live_players, live_answers.
--   4. Service-role RPCs:
--        - live_session_create: creates session and copies question snapshot with idx 0..n-1 in one transaction.
--        - live_session_end: sets ended phase and computes/inserts team XP averages idempotently.

BEGIN;

-- ===========================================================================
-- 1. Tables
-- ===========================================================================

-- 1.1 live_quizzes: ชุดควิซของผู้สอน
CREATE TABLE public.live_quizzes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_quizzes_owner_id_idx ON public.live_quizzes (owner_id);

-- 1.2 live_quiz_questions: คำถามในชุดควิซ
CREATE TABLE public.live_quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid NOT NULL REFERENCES public.live_quizzes(id) ON DELETE CASCADE,
  no             integer NOT NULL,
  text           text NOT NULL,
  choices        jsonb NOT NULL,
  answer         text NOT NULL,
  time_limit_sec integer NOT NULL DEFAULT 20,
  CONSTRAINT live_quiz_questions_time_limit_check CHECK (time_limit_sec IN (5, 10, 20, 30, 60, 90, 120)),
  CONSTRAINT live_quiz_questions_choices_check CHECK (
    jsonb_typeof(choices) = 'array' AND jsonb_array_length(choices) BETWEEN 2 AND 4
  )
);
CREATE INDEX live_quiz_questions_quiz_id_no_idx ON public.live_quiz_questions (quiz_id, no);

-- 1.3 live_sessions: ห้องควิซสด
CREATE TABLE public.live_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin                  text NOT NULL,
  host_id              text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id              uuid REFERENCES public.live_quizzes(id) ON DELETE SET NULL,
  title                text NOT NULL,
  total                integer NOT NULL,
  course_id            text NOT NULL REFERENCES public.courses_all(id) ON DELETE CASCADE,
  team_mode            boolean NOT NULL DEFAULT false,
  restrict_to_course   boolean NOT NULL DEFAULT true,
  phase                text NOT NULL DEFAULT 'lobby',
  current_index        integer NOT NULL DEFAULT -1,
  question_started_at  timestamptz,
  question_deadline_at timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  ended_at             timestamptz,
  CONSTRAINT live_sessions_total_check CHECK (total > 0),
  CONSTRAINT live_sessions_phase_check CHECK (phase IN ('lobby', 'question', 'reveal', 'leaderboard', 'ended'))
);
CREATE UNIQUE INDEX live_sessions_pin_active_key ON public.live_sessions (pin) WHERE phase <> 'ended';
CREATE INDEX live_sessions_host_id_idx ON public.live_sessions (host_id);
CREATE INDEX live_sessions_course_id_idx ON public.live_sessions (course_id);

-- 1.4 live_session_questions: snapshot คำถามตอนเปิดห้อง (client อ่านไม่ได้)
CREATE TABLE public.live_session_questions (
  session_id     uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  idx            integer NOT NULL,
  text           text NOT NULL,
  choices        jsonb NOT NULL,
  answer         text NOT NULL,
  time_limit_sec integer NOT NULL,
  PRIMARY KEY (session_id, idx),
  CONSTRAINT live_session_questions_idx_check CHECK (idx >= 0),
  CONSTRAINT live_session_questions_time_limit_check CHECK (time_limit_sec IN (5, 10, 20, 30, 60, 90, 120)),
  CONSTRAINT live_session_questions_choices_check CHECK (
    jsonb_typeof(choices) = 'array' AND jsonb_array_length(choices) BETWEEN 2 AND 4
  )
);

-- 1.5 live_teams: ทีมถาวรของรายวิชา
CREATE TABLE public.live_teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  text NOT NULL REFERENCES public.courses_all(id) ON DELETE CASCADE,
  color_no   integer NOT NULL,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_teams_color_no_check CHECK (color_no BETWEEN 1 AND 8),
  CONSTRAINT live_teams_course_id_color_no_key UNIQUE (course_id, color_no)
);
CREATE INDEX live_teams_course_id_idx ON public.live_teams (course_id);

-- 1.6 live_players: ผู้เล่นที่เข้าห้อง
CREATE TABLE public.live_players (
  session_id   uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  team_id      uuid REFERENCES public.live_teams(id) ON DELETE SET NULL,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
CREATE INDEX live_players_user_id_idx ON public.live_players (user_id);
CREATE INDEX live_players_team_id_idx ON public.live_players (team_id);

-- 1.7 live_answers: คำตอบรายข้อของผู้เล่น
CREATE TABLE public.live_answers (
  session_id   uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  question_idx integer NOT NULL,
  user_id      text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chosen       text NOT NULL,
  correct      boolean NOT NULL,
  points       integer NOT NULL,
  answered_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, question_idx, user_id),
  CONSTRAINT live_answers_session_question_fk FOREIGN KEY (session_id, question_idx)
    REFERENCES public.live_session_questions (session_id, idx) ON DELETE CASCADE,
  CONSTRAINT live_answers_points_check CHECK (points >= 0 AND points <= 1000)
);
CREATE INDEX live_answers_user_id_idx ON public.live_answers (user_id);

-- 1.8 live_team_members: สมาชิกทีมถาวรต่อรายวิชา (1 คน 1 ทีมต่อวิชา)
CREATE TABLE public.live_team_members (
  course_id text NOT NULL REFERENCES public.courses_all(id) ON DELETE CASCADE,
  user_id   text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id   uuid NOT NULL REFERENCES public.live_teams(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, user_id)
);
CREATE INDEX live_team_members_team_id_idx ON public.live_team_members (team_id);

-- 1.9 live_team_results: ผลคะแนนเฉลี่ยของทีมตอนห้อง ended (ที่มาของ XP)
CREATE TABLE public.live_team_results (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  team_id    uuid NOT NULL REFERENCES public.live_teams(id) ON DELETE CASCADE,
  score      integer NOT NULL,
  members    integer NOT NULL,
  PRIMARY KEY (session_id, team_id),
  CONSTRAINT live_team_results_score_check CHECK (score >= 0),
  CONSTRAINT live_team_results_members_check CHECK (members >= 0)
);
CREATE INDEX live_team_results_team_id_idx ON public.live_team_results (team_id);


-- ===========================================================================
-- 2. Row Level Security & Policies
-- ===========================================================================

ALTER TABLE public.live_quizzes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_team_results      ENABLE ROW LEVEL SECURITY;

-- 2.1 live_quizzes: เจ้าของ (ที่เป็น instructor) จัดการได้ทั้งหมด
CREATE POLICY live_quizzes_owner ON public.live_quizzes
  FOR ALL TO authenticated
  USING (owner_id = (SELECT public.current_user_id()) AND public.is_instructor())
  WITH CHECK (owner_id = (SELECT public.current_user_id()) AND public.is_instructor());

-- 2.2 live_quiz_questions: จัดการได้เมื่อชุดควิซแม่เป็นของตัวเอง
CREATE POLICY live_quiz_questions_owner ON public.live_quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_quizzes q
      WHERE q.id = live_quiz_questions.quiz_id
        AND q.owner_id = (SELECT public.current_user_id())
        AND public.is_instructor()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_quizzes q
      WHERE q.id = live_quiz_questions.quiz_id
        AND q.owner_id = (SELECT public.current_user_id())
        AND public.is_instructor()
    )
  );

-- 2.3 live_sessions: host หรือผู้เล่นในห้องนั้นอ่านได้
-- Owned by the migration role, like current_user_id(); bypass table RLS to avoid recursion.
CREATE FUNCTION public.live_is_host(p_session uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE id = p_session AND host_id = public.current_user_id()
  );
$fn$;

CREATE FUNCTION public.live_is_player(p_session uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.live_players
    WHERE session_id = p_session AND user_id = public.current_user_id()
  );
$fn$;

REVOKE ALL ON FUNCTION public.live_is_host(uuid), public.live_is_player(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_is_host(uuid), public.live_is_player(uuid) TO authenticated;

CREATE POLICY live_sessions_select ON public.live_sessions
  FOR SELECT TO authenticated
  USING (public.live_is_host(id) OR public.live_is_player(id));

-- 2.4 live_players: host ของห้องหรือเจ้าของแถวอ่านได้
CREATE POLICY live_players_select ON public.live_players
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT public.current_user_id())
    OR public.live_is_host(session_id)
  );

-- 2.5 live_answers: host ของห้องเท่านั้นที่อ่านได้
CREATE POLICY live_answers_select ON public.live_answers
  FOR SELECT TO authenticated
  USING (public.live_is_host(session_id));

-- 2.6 live_session_questions, live_teams, live_team_members, live_team_results:
--     ไม่มี policy สำหรับ authenticated/anon (service_role เข้าถึงเท่านั้น)


-- ===========================================================================
-- 3. Grants & Default ACLs
-- ===========================================================================

REVOKE ALL ON
  public.live_quizzes,
  public.live_quiz_questions,
  public.live_sessions,
  public.live_session_questions,
  public.live_players,
  public.live_answers,
  public.live_teams,
  public.live_team_members,
  public.live_team_results
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_quizzes, public.live_quiz_questions TO authenticated;
GRANT SELECT ON public.live_sessions, public.live_players, public.live_answers TO authenticated;

GRANT ALL ON
  public.live_quizzes,
  public.live_quiz_questions,
  public.live_sessions,
  public.live_session_questions,
  public.live_players,
  public.live_answers,
  public.live_teams,
  public.live_team_members,
  public.live_team_results
TO service_role;


-- ===========================================================================
-- 4. Supabase Realtime Publication
-- ===========================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.live_sessions,
  public.live_players,
  public.live_answers;


-- ===========================================================================
-- 5. Service-Role RPC Functions
-- ===========================================================================

-- 5.1 live_session_create: สร้างห้องและ copy คำถามลง snapshot พร้อม idx 0..n-1 ใน transaction เดียว
CREATE FUNCTION public.live_session_create(
  p_host text,
  p_quiz uuid,
  p_course text,
  p_pin text,
  p_team_mode boolean DEFAULT false,
  p_restrict boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_title text;
  v_total integer;
  v_session_id uuid;
BEGIN
  SELECT title INTO v_title
  FROM public.live_quizzes
  WHERE id = p_quiz;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz % not found', p_quiz;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.live_quiz_questions
  WHERE quiz_id = p_quiz;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Quiz % has no questions', p_quiz;
  END IF;

  INSERT INTO public.live_sessions (
    pin,
    host_id,
    quiz_id,
    title,
    total,
    course_id,
    team_mode,
    restrict_to_course,
    phase,
    current_index
  ) VALUES (
    p_pin,
    p_host,
    p_quiz,
    v_title,
    v_total,
    p_course,
    COALESCE(p_team_mode, false),
    COALESCE(p_restrict, true),
    'lobby',
    -1
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.live_session_questions (
    session_id,
    idx,
    text,
    choices,
    answer,
    time_limit_sec
  )
  SELECT
    v_session_id,
    (row_number() OVER (ORDER BY no)) - 1,
    text,
    choices,
    answer,
    time_limit_sec
  FROM public.live_quiz_questions
  WHERE quiz_id = p_quiz
  ORDER BY no;

  RETURN v_session_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.live_session_create(text, uuid, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_session_create(text, uuid, text, text, boolean, boolean) TO service_role;


-- 5.2 live_session_end: จบห้องและคำนวณคะแนนเฉลี่ยทีมลง live_team_results (idempotent)
CREATE FUNCTION public.live_session_end(p_session uuid, p_expected_phase text, p_expected_index integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_team_mode boolean;
  v_current_index integer;
  v_phase text;
BEGIN
  SELECT phase, team_mode, current_index
  INTO v_phase, v_team_mode, v_current_index
  FROM public.live_sessions
  WHERE id = p_session
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'conflict';
  END IF;

  IF v_phase <> 'ended' THEN
    IF v_phase IS DISTINCT FROM p_expected_phase OR v_current_index IS DISTINCT FROM p_expected_index THEN
      RETURN 'conflict';
    END IF;
    UPDATE public.live_sessions
    SET phase = 'ended',
        ended_at = now()
    WHERE id = p_session;
  END IF;

  -- คำนวณผลทีมเฉพาะเมื่อเปิดโหมดทีมและห้องเริ่มเล่นแล้วอย่างน้อย 1 ข้อ
  IF v_team_mode IS TRUE AND v_current_index >= 0 THEN
    WITH team_players AS (
      SELECT
        p.team_id,
        p.user_id,
        COALESCE(SUM(a.points), 0)::numeric AS player_total
      FROM public.live_players p
      LEFT JOIN public.live_answers a
        ON a.session_id = p.session_id
       AND a.user_id = p.user_id
      WHERE p.session_id = p_session
        AND p.team_id IS NOT NULL
      GROUP BY p.team_id, p.user_id
    ),
    team_agg AS (
      SELECT
        team_id,
        round(avg(player_total))::integer AS score,
        count(*)::integer AS members
      FROM team_players
      GROUP BY team_id
    )
    INSERT INTO public.live_team_results (session_id, team_id, score, members)
    SELECT
      p_session,
      team_id,
      score,
      members
    FROM team_agg
    ON CONFLICT (session_id, team_id) DO NOTHING;
  END IF;
  RETURN 'ok';
END;
$fn$;

REVOKE ALL ON FUNCTION public.live_session_end(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_session_end(uuid, text, integer) TO service_role;

-- Answer acceptance shares the session lock; ending/advancing waits for accepted answers.
CREATE FUNCTION public.live_answer_submit(
  p_session uuid, p_user text, p_idx integer, p_chosen text, p_now timestamptz
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_session public.live_sessions%ROWTYPE;
  v_question public.live_session_questions%ROWTYPE;
  v_correct boolean;
  v_elapsed numeric;
  v_limit numeric;
  v_points integer;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session FOR SHARE;
  IF NOT FOUND THEN RETURN 'closed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.live_players WHERE session_id = p_session AND user_id = p_user
  ) THEN RETURN 'not_player'; END IF;
  IF v_session.phase <> 'question' OR v_session.current_index IS DISTINCT FROM p_idx THEN
    RETURN 'closed';
  END IF;
  IF p_now IS NULL OR v_session.question_started_at IS NULL OR v_session.question_deadline_at IS NULL THEN
    RETURN 'closed';
  END IF;
  IF p_now > v_session.question_deadline_at + interval '500 milliseconds' THEN RETURN 'late'; END IF;
  SELECT * INTO v_question FROM public.live_session_questions WHERE session_id = p_session AND idx = p_idx;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_question.choices) AS c WHERE c->>'id' = p_chosen
  ) THEN RETURN 'invalid'; END IF;
  v_correct := p_chosen = v_question.answer;
  v_limit := v_question.time_limit_sec * 1000;
  v_elapsed := greatest(0, least(extract(epoch FROM (p_now - v_session.question_started_at)) * 1000, v_limit));
  -- Keep this formula in sync with lib/live.js scorePoints.
  v_points := CASE WHEN v_correct THEN round(1000 * (1 - (v_elapsed / v_limit) / 2))::integer ELSE 0 END;
  INSERT INTO public.live_answers (session_id, question_idx, user_id, chosen, correct, points, answered_at)
  VALUES (p_session, p_idx, p_user, p_chosen, v_correct, v_points, p_now)
  ON CONFLICT (session_id, question_idx, user_id) DO NOTHING;
  IF NOT FOUND THEN RETURN 'duplicate'; END IF;
  RETURN 'ok';
END;
$fn$;

CREATE FUNCTION public.live_join_team(p_course text, p_user text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_team uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('live_team:' || p_course));
  SELECT team_id INTO v_team FROM public.live_team_members WHERE course_id = p_course AND user_id = p_user;
  IF FOUND THEN RETURN v_team; END IF;
  SELECT t.id INTO v_team
  FROM public.live_teams t
  LEFT JOIN public.live_team_members m ON m.team_id = t.id
  WHERE t.course_id = p_course
  GROUP BY t.id, t.color_no
  ORDER BY count(m.user_id), t.color_no
  LIMIT 1;
  IF v_team IS NOT NULL THEN
    INSERT INTO public.live_team_members (course_id, user_id, team_id) VALUES (p_course, p_user, v_team);
  END IF;
  RETURN v_team;
END;
$fn$;

-- Joining and ending serialize on the session row, including team assignment.
CREATE FUNCTION public.live_join_session(p_session uuid, p_user text, p_name text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_session public.live_sessions%ROWTYPE;
  v_team uuid;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session FOR SHARE;
  IF NOT FOUND OR v_session.phase = 'ended' THEN RETURN 'closed'; END IF;

  SELECT team_id INTO v_team FROM public.live_players
  WHERE session_id = p_session AND user_id = p_user;
  IF NOT FOUND AND v_session.team_mode THEN
    v_team := public.live_join_team(v_session.course_id, p_user);
  END IF;

  INSERT INTO public.live_players (session_id, user_id, display_name, team_id)
  VALUES (p_session, p_user, p_name, v_team)
  ON CONFLICT (session_id, user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name;
  RETURN 'ok';
END;
$fn$;

CREATE FUNCTION public.live_move_player(p_session uuid, p_user text, p_team uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_session public.live_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND OR v_session.phase <> 'lobby' THEN RETURN 'closed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.live_teams WHERE id = p_team AND course_id = v_session.course_id) THEN
    RETURN 'invalid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.live_players WHERE session_id = p_session AND user_id = p_user) THEN
    RETURN 'not_player';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('live_team:' || v_session.course_id));
  INSERT INTO public.live_team_members (course_id, user_id, team_id)
  VALUES (v_session.course_id, p_user, p_team)
  ON CONFLICT (course_id, user_id) DO UPDATE SET team_id = EXCLUDED.team_id;
  UPDATE public.live_players SET team_id = p_team WHERE session_id = p_session AND user_id = p_user;
  RETURN 'ok';
END;
$fn$;

CREATE FUNCTION public.live_session_totals(p_session uuid)
RETURNS TABLE (user_id text, score bigint, correct bigint, answered bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT p.user_id, coalesce(sum(a.points), 0)::bigint,
         count(*) FILTER (WHERE a.correct), count(a.user_id)
  FROM public.live_players p
  LEFT JOIN public.live_answers a ON a.session_id = p.session_id AND a.user_id = p.user_id
  WHERE p.session_id = p_session
  GROUP BY p.user_id;
$fn$;

CREATE FUNCTION public.live_question_stats(p_session uuid)
RETURNS TABLE (idx integer, answered bigint, correct bigint, choice_counts jsonb, team_stats jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  WITH counts AS (
    SELECT a.question_idx, a.chosen, count(*) AS answered, count(*) FILTER (WHERE a.correct) AS correct
    FROM public.live_answers a WHERE a.session_id = p_session GROUP BY a.question_idx, a.chosen
  )
  SELECT c.question_idx, sum(c.answered)::bigint, sum(c.correct)::bigint,
         jsonb_object_agg(c.chosen, c.answered),
         (
           SELECT jsonb_object_agg(t.team_id, jsonb_build_object('members', t.members, 'correct', t.correct))
           FROM (
             SELECT p.team_id, count(*) AS members, count(*) FILTER (WHERE a.correct) AS correct
             FROM public.live_players p
             LEFT JOIN public.live_answers a ON a.session_id = p.session_id AND a.user_id = p.user_id
               AND a.question_idx = c.question_idx
             WHERE p.session_id = p_session AND p.team_id IS NOT NULL
             GROUP BY p.team_id
           ) t
         )
  FROM counts c GROUP BY c.question_idx;
$fn$;

REVOKE ALL ON FUNCTION public.live_answer_submit(uuid, text, integer, text, timestamptz),
  public.live_join_team(text, text), public.live_join_session(uuid, text, text),
  public.live_move_player(uuid, text, uuid),
  public.live_session_totals(uuid), public.live_question_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_answer_submit(uuid, text, integer, text, timestamptz),
  public.live_join_team(text, text), public.live_join_session(uuid, text, text),
  public.live_move_player(uuid, text, uuid),
  public.live_session_totals(uuid), public.live_question_stats(uuid) TO service_role;


NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (the DROPs only exist here). Run top to bottom to clean up.
-- ===========================================================================
-- BEGIN;
-- ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.live_answers, public.live_players, public.live_sessions;
-- DROP FUNCTION IF EXISTS public.live_question_stats(uuid);
-- DROP FUNCTION IF EXISTS public.live_session_totals(uuid);
-- DROP FUNCTION IF EXISTS public.live_move_player(uuid, text, uuid);
-- DROP FUNCTION IF EXISTS public.live_join_session(uuid, text, text);
-- DROP FUNCTION IF EXISTS public.live_join_team(text, text);
-- DROP FUNCTION IF EXISTS public.live_answer_submit(uuid, text, integer, text, timestamptz);
-- DROP FUNCTION IF EXISTS public.live_session_end(uuid, text, integer);
-- DROP FUNCTION IF EXISTS public.live_session_create(text, uuid, text, text, boolean, boolean);
-- DROP TABLE IF EXISTS public.live_team_results;
-- DROP TABLE IF EXISTS public.live_team_members;
-- DROP TABLE IF EXISTS public.live_answers;
-- DROP TABLE IF EXISTS public.live_players;
-- DROP TABLE IF EXISTS public.live_teams;
-- DROP TABLE IF EXISTS public.live_session_questions;
-- DROP TABLE IF EXISTS public.live_sessions;
-- DROP TABLE IF EXISTS public.live_quiz_questions;
-- DROP TABLE IF EXISTS public.live_quizzes;
-- DROP FUNCTION IF EXISTS public.live_is_host(uuid);
-- DROP FUNCTION IF EXISTS public.live_is_player(uuid);
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
