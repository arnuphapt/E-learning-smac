import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Server-minted JWT (see /api/supabase-token) so RLS identity can't be forged by the browser.
let cached = null; // { token, exp, sub }
let inflight = null;

async function getAccessToken() {
  if (typeof window === 'undefined') return null;
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;
  // Every query awaits this, so none leaves before the token is ready.
  inflight ??= fetch('/api/supabase-token', { cache: 'no-store' })
    .then(async (r) => {
      if (!r.ok) return null; // not signed in -> supabase-js falls back to the anon key
      cached = await r.json();
      return cached.token;
    })
    .catch(() => null)
    .finally(() => { inflight = null; });
  return inflight;
}

// Drop the cached token when the signed-in user changes (login/logout in the same tab).
export function syncSupabaseUser(userId) {
  if (cached && cached.sub !== userId) cached = null;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  accessToken: getAccessToken,
});
