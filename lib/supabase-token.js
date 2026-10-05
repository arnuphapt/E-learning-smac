// Server-only: mints the short-lived Supabase JWT that RLS reads via auth.jwt().
// Signed HS256 with the project's legacy JWT secret (server env, never NEXT_PUBLIC_).
import { createHmac } from "node:crypto";

const TTL_SECONDS = 3600;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

// nextAuthToken = decoded NextAuth JWT (getToken). Claims: sub = app user id, app_role = app role.
export function mintSupabaseToken(nextAuthToken) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
  const sub = String(nextAuthToken.dbId || nextAuthToken.sub);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TTL_SECONDS;
  const data = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    aud: "authenticated",
    role: "authenticated",
    sub,
    app_role: nextAuthToken.role || "student",
    iat,
    exp,
  })}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return { token: `${data}.${sig}`, exp, sub };
}

// Headers for server-side supabase clients acting as the signed-in user ({} when no session).
export function supabaseAuthHeaders(nextAuthToken) {
  if (!nextAuthToken) return {};
  return { Authorization: `Bearer ${mintSupabaseToken(nextAuthToken).token}` };
}
