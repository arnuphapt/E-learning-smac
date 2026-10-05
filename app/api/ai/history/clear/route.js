import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hideSession } from "@/lib/chat-history";

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // identity comes only from the verified session, never from the request body
  const { error } = await hideSession(supabaseAdmin(), String(token.dbId || token.sub), sessionId);
  if (error) {
    console.error("Failed to hide chat session:", error);
    return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
