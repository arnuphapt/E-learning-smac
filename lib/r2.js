// Server-only: Cloudflare R2 access. Never import this from a "use client" file.
// DB columns (lessons.video_url, documents[].url, ai_documents[].url, submissions.file)
// now hold the R2 object KEY. Old rows still hold a full public URL; toKey() accepts both.
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Video: lessons run ~40-50 min; 2h covers pauses/seeking if the browser keeps the signed URL.
// Everything else is opened right after the click, so 5 min is plenty.
const VIDEO_TTL = 2 * 60 * 60;
const FILE_TTL = 5 * 60;
const VIDEO_RE = /\.(mp4|webm|mov|m4v)$/i;

let cached;

// Returns null when R2 env is not configured (dev mock mode).
export function getR2() {
  if (cached !== undefined) return cached;
  const { R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET_NAME: bucket } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    cached = null;
  } else {
    cached = {
      bucket,
      s3: new S3Client({
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
        region: "auto",
        requestChecksumCalculation: "WHEN_REQUIRED",
      }),
    };
  }
  return cached;
}

const MOCK_PREFIX = "/mock-uploads/";

// Stored value (key | legacy public URL) -> R2 key, or null if it is not an R2 reference.
// Legacy URLs were built as `${base}${key}` with no encoding, so the key is the raw remainder.
export function toKey(ref) {
  if (typeof ref !== "string" || !ref) return null;
  if (ref.startsWith(MOCK_PREFIX)) return ref.slice(MOCK_PREFIX.length);

  const legacyBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/?$/, "/");
  if (legacyBase.length > 1 && ref.startsWith(legacyBase)) return ref.slice(legacyBase.length);

  const m = ref.match(/^https?:\/\/([^/]+)\/(.+)$/s);
  if (m) {
    if (m[1].endsWith(".r2.dev")) return m[2];
    if (m[1].endsWith(".r2.cloudflarestorage.com")) {
      const i = m[2].indexOf("/"); // path-style: /<bucket>/<key>
      return i > 0 ? m[2].slice(i + 1) : null;
    }
    return null; // foreign URL (e.g. Supabase storage) - not ours to sign
  }
  if (/^https?:\/\//.test(ref)) return null;
  return ref.includes("/") ? ref : null; // plain filenames (seed data) are not keys
}

export async function signGet(key) {
  const { s3, bucket } = getR2();
  const expiresIn = VIDEO_RE.test(key) ? VIDEO_TTL : FILE_TTL;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

// Server-side read for the AI (credentials stay on the server). Returns a Buffer or null.
export async function readObject(key) {
  const r2 = getR2();
  if (!r2) return null;
  const res = await r2.s3.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
  return Buffer.from(await res.Body.transformToByteArray());
}

const STAFF_ROLES = ["instructor", "admin", "course_manager"];

function isStaff(token) {
  return String(token.role || "").split(",").some((r) => STAFF_ROLES.includes(r.trim()));
}

// Key-shape guard shared by canView/canUpload: no traversal, empty segments, backslashes,
// and no percent-encoded ".", "/" or "\\" (%2e %2f %5c) that a decoder could turn into one.
function isSafeKey(key) {
  if (typeof key !== "string" || !key || key.length > 1024 || key.includes("\\")) return false;
  if (/%(2e|2f|5c)/i.test(key)) return false;
  return key.split("/").every((seg) => seg && seg !== "." && seg !== "..");
}

// Who may view a key. token = next-auth JWT (getToken) or null.
// ponytail: students are not checked against course enrollment (that rule lives client-side
// in s/courses + s/ai and is complex); upgrade here if per-course isolation is required.
export function canView(token, key) {
  if (!token || !isSafeKey(key)) return false;
  if (isStaff(token)) return true;
  if (/^lessons\/[^/]+\/ai_documents\//.test(key)) return false; // AI-only: never to students
  if (/^lessons\/[^/]+\/(video|documents)\//.test(key)) return true;
  const own = token.dbId || token.sub;
  return !!own && key.startsWith(`submissions/${own}/`);
}

// Who may upload (presign a PUT) to a key.
export function canUpload(token, key) {
  if (!token || !isSafeKey(key)) return false;
  if (isStaff(token)) return /^lessons\/[^/]+\/(video|documents|ai_documents)\//.test(key);
  const own = token.dbId || token.sub;
  return !!own && key.startsWith(`submissions/${own}/`);
}
