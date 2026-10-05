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
  global: {
    fetch: (url, options = {}) => {
      if (typeof window !== 'undefined') {
        // ponytail: x-user-* headers are only for the window before the rls_jwt_claims DDL is applied; remove them (and SessionProvider's copy) afterwards.
        const userId = window.__supabase_user_id || window.sessionStorage.getItem('sb-user-id');
        const userRole = window.__supabase_user_role || window.sessionStorage.getItem('sb-user-role');
        
        if (userId) {
          if (!options.headers) {
            options.headers = {};
          }
          
          if (options.headers instanceof Headers || typeof options.headers.set === 'function') {
            options.headers.set('x-user-id', userId);
            options.headers.set('x-user-role', userRole || 'student');
          } else {
            options.headers['x-user-id'] = userId;
            options.headers['x-user-role'] = userRole || 'student';
          }
        }
      }
      return fetch(url, options);
    }
  }
});
