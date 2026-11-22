import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isTutorOnlyRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hideSession } from "@/lib/chat-history";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = typeof token.role === "string" ? token.role : "";
  if (isTutorOnlyRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); // tutor mode only

  const rawBody: unknown = await req.json().catch(() => ({}));
  const sessionId =
    rawBody && typeof rawBody === "object" && "sessionId" in rawBody
      ? (rawBody as { sessionId?: unknown }).sessionId
      : undefined;
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // identity comes only from the verified session, never from the request body
  const studentId =
    typeof token.dbId === "string" && token.dbId
      ? token.dbId
      : typeof token.sub === "string"
        ? token.sub
        : "";
  const { error } = await hideSession(supabaseAdmin(), studentId, sessionId);
  if (error) {
    console.error("Failed to hide chat session:", error);
    return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
