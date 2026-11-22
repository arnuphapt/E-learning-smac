import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, verify } from "node:crypto";

const ORIG_PRIVATE_KEY = process.env.SUPABASE_JWT_PRIVATE_KEY;
const ORIG_SECRET = process.env.SUPABASE_JWT_SECRET;

function restoreEnv() {
  if (ORIG_PRIVATE_KEY === undefined) {
    delete process.env.SUPABASE_JWT_PRIVATE_KEY;
  } else {
    process.env.SUPABASE_JWT_PRIVATE_KEY = ORIG_PRIVATE_KEY;
  }
  if (ORIG_SECRET === undefined) {
    delete process.env.SUPABASE_JWT_SECRET;
  } else {
    process.env.SUPABASE_JWT_SECRET = ORIG_SECRET;
  }
}

let importSeq = 0;
async function loadModule() {
  importSeq += 1;
  return import(`../lib/supabase-token.ts?case=${importSeq}`);
}

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe("mintSupabaseToken", () => {
  afterEach(restoreEnv);

  it("signs ES256 with kid when SUPABASE_JWT_PRIVATE_KEY is set", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const jwk = { ...privateKey.export({ format: "jwk" }), kid: "test-kid-1" };
    process.env.SUPABASE_JWT_PRIVATE_KEY = JSON.stringify(jwk);
    delete process.env.SUPABASE_JWT_SECRET;

    const { mintSupabaseToken, supabaseAuthHeaders } = await loadModule();
    const result = mintSupabaseToken({
      dbId: "user-42",
      sub: "oauth-sub",
      role: "instructor",
    });

    const parts = result.token.split(".");
    assert.equal(parts.length, 3);
    const [headerB64, payloadB64, sigB64] = parts;

    const header = decodeJwtPart(headerB64);
    assert.deepEqual(header, { alg: "ES256", typ: "JWT", kid: "test-kid-1" });

    const sig = Buffer.from(sigB64, "base64url");
    assert.equal(sig.length, 64);
    const ok = verify(
      "sha256",
      Buffer.from(`${headerB64}.${payloadB64}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      sig
    );
    assert.equal(ok, true);

    const payload = decodeJwtPart(payloadB64);
    assert.equal(payload.sub, "user-42");
    assert.equal(payload.app_role, "instructor");
    assert.equal(payload.role, "authenticated");
    assert.equal(payload.aud, "authenticated");
    assert.equal(payload.exp - payload.iat, 3600);
    assert.equal(result.sub, "user-42");
    assert.equal(result.exp, payload.exp);

    assert.deepEqual(supabaseAuthHeaders(null), {});
    assert.match(
      supabaseAuthHeaders({ sub: "user-42" }).Authorization,
      /^Bearer [^.]+\.[^.]+\.[^.]+$/
    );
  });

  it("throws when SUPABASE_JWT_PRIVATE_KEY JWK lacks kid", async () => {
    const { privateKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const jwk = privateKey.export({ format: "jwk" });
    process.env.SUPABASE_JWT_PRIVATE_KEY = JSON.stringify(jwk);
    delete process.env.SUPABASE_JWT_SECRET;

    const { mintSupabaseToken } = await loadModule();
    assert.throws(() => mintSupabaseToken({ sub: "user-1" }), /kid/);
  });

  it("falls back to HS256 when only SUPABASE_JWT_SECRET is set", async () => {
    delete process.env.SUPABASE_JWT_PRIVATE_KEY;
    process.env.SUPABASE_JWT_SECRET = "legacy-hs256-secret";

    const { mintSupabaseToken } = await loadModule();
    const { token } = mintSupabaseToken({ sub: "user-hs", role: "student" });

    const parts = token.split(".");
    assert.equal(parts.length, 3);
    const [headerB64, payloadB64, sigB64] = parts;

    const header = decodeJwtPart(headerB64);
    assert.deepEqual(header, { alg: "HS256", typ: "JWT" });

    const expectedSig = createHmac("sha256", "legacy-hs256-secret")
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");
    assert.equal(sigB64, expectedSig);
  });

  it("throws when neither SUPABASE_JWT_PRIVATE_KEY nor SUPABASE_JWT_SECRET is set", async () => {
    delete process.env.SUPABASE_JWT_PRIVATE_KEY;
    delete process.env.SUPABASE_JWT_SECRET;

    const { mintSupabaseToken } = await loadModule();
    assert.throws(
      () => mintSupabaseToken({ sub: "user-1" }),
      /Neither SUPABASE_JWT_PRIVATE_KEY nor SUPABASE_JWT_SECRET is set/
    );
  });
});
