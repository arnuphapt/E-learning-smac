import { type NextRequest } from "next/server";
import { resolveDragonAssetKey } from "@/lib/dragon-asset-path";
import { getR2, signGet, signHead } from "@/lib/r2";

const PRESIGN_TTL_SECONDS = 3600;
const REDIRECT_CACHE_CONTROL = "public, max-age=3000";

async function handleDragonAsset(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path: segments } = await context.params;
  const key = resolveDragonAssetKey(segments);
  if (!key) {
    return new Response("Not Found", { status: 404 });
  }

  if (!getR2()) {
    return new Response("Storage unavailable", { status: 500 });
  }

  try {
    const signedUrl =
      req.method === "HEAD"
        ? await signHead(key, PRESIGN_TTL_SECONDS)
        : await signGet(key, PRESIGN_TTL_SECONDS);
    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        "Cache-Control": REDIRECT_CACHE_CONTROL,
      },
    });
  } catch {
    return new Response("Storage unavailable", { status: 500 });
  }
}

export const GET = handleDragonAsset;
export const HEAD = handleDragonAsset;
