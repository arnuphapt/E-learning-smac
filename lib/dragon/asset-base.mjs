let envBase;
try {
  envBase = process.env.NEXT_PUBLIC_DRAGON_ASSET_BASE;
} catch {
  // process is undefined in plain browser without Next.js inlining
}

const BASE = (envBase || '/dragon').replace(/\/+$/, '');

export function assetUrl(path) {
  if (!path || /^(?:https?:|data:|blob:)/i.test(path)) return path;
  if (BASE && (path === BASE || path.startsWith(BASE + '/'))) return path;
  const normalized = path.startsWith('/') ? path : '/' + path;
  return `${BASE}${normalized}`;
}
