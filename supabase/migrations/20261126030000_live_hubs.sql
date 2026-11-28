-- Live Hubs: instructor-owned hubs with optional year-level targeting.
-- Written for Dice to run manually in the Supabase SQL Editor (dev first). Do not run via CLI/MCP without confirmation.

BEGIN;

-- ===========================================================================
-- 1. Table & Columns
-- ===========================================================================

CREATE TABLE public.live_hubs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id    text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  year_level integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_hubs_name_check CHECK (char_length(trim(name)) BETWEEN 1 AND 120)
);
CREATE INDEX live_hubs_host_id_idx ON public.live_hubs (host_id);

ALTER TABLE public.live_sessions
  ADD COLUMN hub_id uuid REFERENCES public.live_hubs(id) ON DELETE SET NULL;
CREATE INDEX live_sessions_hub_id_idx ON public.live_sessions (hub_id);

-- ===========================================================================
-- 2. Row Level Security & Grants
-- ===========================================================================

ALTER TABLE public.live_hubs ENABLE ROW LEVEL SECURITY;

-- เจ้าของ (ที่เป็น instructor) จัดการ hub ของตัวเองได้ทั้งหมด
CREATE POLICY live_hubs_owner ON public.live_hubs
  FOR ALL TO authenticated
  USING (host_id = (SELECT public.current_user_id()) AND public.is_instructor())
  WITH CHECK (host_id = (SELECT public.current_user_id()) AND public.is_instructor());

REVOKE ALL ON public.live_hubs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_hubs TO authenticated;
GRANT ALL ON public.live_hubs TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
