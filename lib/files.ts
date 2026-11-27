// Client-safe: turn a stored file reference (R2 key or legacy URL) into a link that the
// server authorises and redirects to a short-lived signed URL. Blob/data previews and
// foreign http(s) URLs (e.g. YouTube or external video links) pass through unchanged.
function isR2HttpUrl(ref: string): boolean {
  const legacyBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/?$/, "/");
  if (legacyBase.length > 1 && ref.startsWith(legacyBase)) return true;
  try {
    const host = new URL(ref).hostname.toLowerCase();
    return host.endsWith(".r2.dev") || host.endsWith(".r2.cloudflarestorage.com");
  } catch {
    return false;
  }
}

export function fileHref(ref: string): string;
export function fileHref(ref: null): null;
export function fileHref(ref: undefined): undefined;
export function fileHref(ref: string | null | undefined): string | null | undefined;
export function fileHref(ref: string | null | undefined): string | null | undefined {
  if (!ref || /^(blob|data):/i.test(ref)) return ref;
  if (/^https?:\/\//i.test(ref) && !isR2HttpUrl(ref)) return ref;
  return `/api/files?ref=${encodeURIComponent(ref)}`;
}

const YT_ID_RE = /^[A-Za-z0-9_-]+$/;

/** Extract a YouTube video ID from watch, youtu.be, shorts, or embed URLs; null otherwise. */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  let id: string | null = null;

  if (host === "youtu.be") {
    id = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com")
  ) {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") {
      id = parsed.searchParams.get("v");
    } else if (parts[0] === "shorts" || parts[0] === "embed") {
      id = parts[1] ?? null;
    }
  }

  return id && YT_ID_RE.test(id) ? id : null;
}

// Every public.lessons column EXCEPT ai_documents. Student pages must select this, never "*",
// so AI-only documents never reach the student browser. Add new lessons columns here.
export const STUDENT_LESSON_COLUMNS =
  "id, course_id, index, title, duration, description, video, pretest, posttest, assignment, status, progress, watch_limit, allow_download, documents, video_url, video_path, allow_ai, has_docs, has_pretest, has_posttest, has_assignment";
