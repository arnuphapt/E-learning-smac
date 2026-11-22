// Server-only: mints the short-lived Supabase JWT that RLS reads via auth.jwt().
// ES256 preferred (Supabase JWT signing keys via SUPABASE_JWT_PRIVATE_KEY);
// HS256 legacy fallback (SUPABASE_JWT_SECRET). Both server-only, never NEXT_PUBLIC_.
import { createHmac, createPrivateKey, sign, type JsonWebKeyInput, type KeyObject } from "node:crypto";

const TTL_SECONDS = 3600;
const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString("base64url");

export interface SupabaseTokenInput {
  dbId?: unknown;
  sub?: unknown;
  role?: unknown;
}

export interface MintedSupabaseToken {
  token: string;
  exp: number;
  sub: string;
}

interface SigningKey {
  key: KeyObject;
  kid: string;
}

let cachedSigningKey: SigningKey | null = null;

function getPrivateSigningKey(raw: string): SigningKey {
  if (cachedSigningKey) return cachedSigningKey;
  let jwk: unknown;
  try {
    jwk = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid SUPABASE_JWT_PRIVATE_KEY JSON: ${message}`);
  }
  if (!jwk || typeof jwk !== "object" || Array.isArray(jwk)) {
    throw new Error("SUPABASE_JWT_PRIVATE_KEY must be a JWK JSON object");
  }
  const record = jwk as Record<string, unknown>;
  if (record.kty !== "EC" || record.crv !== "P-256") {
    throw new Error("SUPABASE_JWT_PRIVATE_KEY must be an EC P-256 JWK");
  }
  if (typeof record.kid !== "string" || !record.kid) {
    throw new Error("SUPABASE_JWT_PRIVATE_KEY JWK must include a kid");
  }
  const key = createPrivateKey({ key: record as JsonWebKeyInput["key"], format: "jwk" });
  cachedSigningKey = { key, kid: record.kid };
  return cachedSigningKey;
}

// nextAuthToken = decoded NextAuth JWT (getToken). Claims: sub = app user id, app_role = app role.
export function mintSupabaseToken(nextAuthToken: SupabaseTokenInput): MintedSupabaseToken {
  const privateKeyEnv = process.env.SUPABASE_JWT_PRIVATE_KEY;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!privateKeyEnv && !secret) {
    throw new Error(
      "Neither SUPABASE_JWT_PRIVATE_KEY nor SUPABASE_JWT_SECRET is set"
    );
  }

  const sub = String(nextAuthToken.dbId || nextAuthToken.sub);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TTL_SECONDS;
  const role = typeof nextAuthToken.role === "string" && nextAuthToken.role ? nextAuthToken.role : "student";
  const payload = {
    aud: "authenticated",
    role: "authenticated",
    sub,
    app_role: role,
    iat,
    exp,
  };

  if (privateKeyEnv) {
    const { key, kid } = getPrivateSigningKey(privateKeyEnv);
    const data = `${b64({ alg: "ES256", typ: "JWT", kid })}.${b64(payload)}`;
    // JWS ES256 requires raw 64-byte R||S (ieee-p1363), not ASN.1 DER.
    const sig = sign("sha256", Buffer.from(data), {
      key,
      dsaEncoding: "ieee-p1363",
    }).toString("base64url");
    return { token: `${data}.${sig}`, exp, sub };
  }

  const data = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  const sig = createHmac("sha256", secret as string).update(data).digest("base64url");
  return { token: `${data}.${sig}`, exp, sub };
}

// Headers for server-side supabase clients acting as the signed-in user ({} when no session).
export function supabaseAuthHeaders(nextAuthToken: SupabaseTokenInput | null | undefined): Record<string, string> {
  if (!nextAuthToken) return {};
  return { Authorization: `Bearer ${mintSupabaseToken(nextAuthToken).token}` };
}
