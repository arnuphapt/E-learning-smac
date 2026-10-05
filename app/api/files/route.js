import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getR2, toKey, canView, signGet } from "@/lib/r2";

// GET /api/files?ref=<stored key or legacy URL>
// Checks the viewer, then 302s to a short-lived presigned R2 GET URL.
// AI-only documents are refused for students; the AI reads them server-side (see api/ai/chat).
export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return new Response("Unauthorized", { status: 401 });

  const key = toKey(req.nextUrl.searchParams.get("ref"));
  if (!key) return new Response("Bad ref", { status: 400 });
  if (!canView(token, key)) return new Response("Forbidden", { status: 403 });

  const headers = { "Cache-Control": "private, no-store" };
  if (!getR2()) {
    // dev mock mode (no R2 env): files are not really stored
    return NextResponse.redirect(new URL(`/mock-uploads/${key}`, req.url), { status: 302, headers });
  }
  return NextResponse.redirect(await signGet(key), { status: 302, headers });
}
