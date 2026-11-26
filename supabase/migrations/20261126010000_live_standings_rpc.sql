-- Live Quiz standings in one round trip, ticket 07 (faster reveal / next).
-- Written for Dice to run manually in the Supabase SQL Editor. Do not run via CLI/MCP.
--
-- What it does:
--   Adds ONE new function, public.live_standings(p_session uuid, p_user text). No table or existing function changes.
--   It replaces the state route's "read every live_players row, then call live_session_totals" pair, so a
--   player request no longer transfers all N players. One row is returned:
--     player_count  number of live_players rows in the session
--     me_score      p_user's total answer points (0 when p_user is not a player, e.g. the host)
--     me_rank       p_user's competition rank (1 + number of players with a strictly higher score);
--                   NULL when p_user is not a player
--     me_team_id    p_user's team (NULL for solo / not a player)
--     top           top 5 players as jsonb [{userId, name, score, rank}] (the route derives top3 from it)
--     teams         team mode only (NULL otherwise): every live_teams row of the session's course as jsonb
--                   [{id, name, colorNo, score, members}] ordered by color_no; the route ranks it with rankRows
--
-- Matches computeSessionStandings / computeTeamStandings in app/api/live/[id]/state/route.ts:
--   * score  = SUM(live_answers.points) per player (same as live_session_totals, uncapped).
--   * order  = score DESC, joined_at ASC, user_id ASC. (JS compares joined_at in ms and user_id with localeCompare;
--              the SQL order differs only for players tied on score AND joined within the same ms AND ids that
--              collate differently. It decides who fills the 5th slot of `top`, never anyone's rank.)
--   * rank   = rank() OVER (ORDER BY score DESC) = rankRows competition ranking (ties share a rank, next rank skips).
--   * team score = round(avg(member scores)) (lib/live.ts teamScore: rounded average; scores are >= 0 so
--              Math.round and numeric round agree); members = players with that team_id; empty team = 0 / 0.
--
-- SECURITY DEFINER, search_path = '', callable by service_role only (same as live_session_totals).

BEGIN;

CREATE FUNCTION public.live_standings(p_session uuid, p_user text)
RETURNS TABLE (
  player_count integer,
  me_score bigint,
  me_rank integer,
  me_team_id uuid,
  top jsonb,
  teams jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  WITH s AS (
    SELECT ls.course_id, ls.team_mode FROM public.live_sessions ls WHERE ls.id = p_session
  ),
  totals AS (
    SELECT p.user_id, p.display_name, p.joined_at, p.team_id,
           coalesce(sum(a.points), 0)::bigint AS score
    FROM public.live_players p
    LEFT JOIN public.live_answers a ON a.session_id = p.session_id AND a.user_id = p.user_id
    WHERE p.session_id = p_session
    GROUP BY p.user_id, p.display_name, p.joined_at, p.team_id
  ),
  ranked AS (
    SELECT t.*, rank() OVER (ORDER BY t.score DESC)::integer AS rnk FROM totals t
  )
  SELECT
    (SELECT count(*) FROM totals)::integer,
    coalesce((SELECT r.score FROM ranked r WHERE r.user_id = p_user), 0)::bigint,
    (SELECT r.rnk FROM ranked r WHERE r.user_id = p_user),
    (SELECT r.team_id FROM ranked r WHERE r.user_id = p_user),
    (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object('userId', x.user_id, 'name', x.display_name, 'score', x.score, 'rank', x.rnk)
          ORDER BY x.score DESC, x.joined_at, x.user_id
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT r.* FROM ranked r ORDER BY r.score DESC, r.joined_at, r.user_id LIMIT 5
      ) x
    ),
    CASE WHEN (SELECT s.team_mode FROM s) THEN (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', t.id, 'name', t.name, 'colorNo', t.color_no,
            'score', coalesce(m.score, 0), 'members', coalesce(m.members, 0)
          )
          ORDER BY t.color_no
        ),
        '[]'::jsonb
      )
      FROM public.live_teams t
      LEFT JOIN (
        SELECT g.team_id, round(avg(g.score))::integer AS score, count(*)::integer AS members
        FROM totals g WHERE g.team_id IS NOT NULL GROUP BY g.team_id
      ) m ON m.team_id = t.id
      WHERE t.course_id = (SELECT s.course_id FROM s)
    ) END;
$fn$;

REVOKE ALL ON FUNCTION public.live_standings(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_standings(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- ROLLBACK (the DROP only exists here). The state route must be reverted first, otherwise it calls a missing function.
-- ===========================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.live_standings(uuid, text);
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
