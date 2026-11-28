export const DRAGON_ASSET_EXTENSIONS = new Set([
  "json",
  "webp",
  "txt",
  "bytes",
  "ttf",
  "md",
]);

/**
 * Validate and normalize `[...path]` route segments into an R2 key under `dragon/`.
 * Returns `null` for any traversal, backslash, empty/absolute segment, or disallowed extension.
 */
export function resolveDragonAssetKey(
  segments: readonly string[] | undefined | null,
): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const clean: string[] = [];
  for (const raw of segments) {
    if (typeof raw !== "string" || !raw) return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (
      !decoded ||
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("..") ||
      decoded.includes("/") ||
      decoded.includes("\\") ||
      decoded.includes("\0")
    ) {
      return null;
    }
    clean.push(decoded);
  }

  const last = clean[clean.length - 1];
  const dot = last.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = last.slice(dot + 1).toLowerCase();
  if (!DRAGON_ASSET_EXTENSIONS.has(ext)) return null;

  return `dragon/${clean.join("/")}`;
}
