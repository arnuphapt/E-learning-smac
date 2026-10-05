// Server-only Supabase client with the service-role key: bypasses RLS and DB triggers' user checks.
// Never import from a "use client" file. The key must stay a non-NEXT_PUBLIC env var.
import { createClient } from "@supabase/supabase-js";

let client = null;

// Lazy so `next build` (no secrets) can still evaluate route modules.
export function supabaseAdmin() {
  if (typeof window !== "undefined") throw new Error("supabaseAdmin() is server-only");
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY (or Supabase URL) is not set");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
