import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Server-minted JWT (see /api/supabase-token) so RLS identity can't be forged by the browser.
let cached = null; // { token, exp, sub }
let inflight = null;

let authStatus = typeof window === 'undefined' ? 'unauthenticated' : 'loading';
let authResolve = null;
const authReady = typeof window === 'undefined' ? Promise.resolve(false) : new Promise((resolve) => {
  authResolve = resolve;
});

async function getAccessToken() {
  if (typeof window === 'undefined') return null;
  if (authStatus === 'loading') {
    await authReady;
  }
  // Only request the token when there is an authenticated next-auth session (status === 'authenticated')
  if (authStatus !== 'authenticated') return null;
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;
  // Every query awaits this, so none leaves before the token is ready.
  inflight ??= fetch('/api/supabase-token', { cache: 'no-store' })
    .then(async (r) => {
      if (!r.ok) {
        // Treat 401 as 'no token' silently -> supabase-js falls back to the anon key
        cached = null;
        return null;
      }
      cached = await r.json();
      return cached.token;
    })
    .catch(() => {
      cached = null;
      return null;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

// Drop the cached token when the signed-in user changes (login/logout in the same tab).
export function syncSupabaseUser(userId, status) {
  const isAuthed = status === 'authenticated' || (status === undefined && Boolean(userId));

  if (isAuthed) {
    authStatus = 'authenticated';
    if (cached && cached.sub !== userId) cached = null;
    authResolve?.(true);
    if (!cached && !inflight) {
      getAccessToken();
    }
  } else if (status === 'unauthenticated' || status === false || (!status && !userId)) {
    authStatus = 'unauthenticated';
    cached = null;
    authResolve?.(false);
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  accessToken: getAccessToken,
});
