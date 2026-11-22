import { GoogleGenAI } from "@google/genai";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isTutorOnlyRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

type HealthResult =
  | { status: "online" }
  | { status: "degraded"; reason: string }
  | { status: "offline"; reason: string };

// Every call used to hit Gemini. Share one result (and one in-flight check) across all callers for TTL_MS.
// ponytail: per-instance memory; on serverless each warm instance checks once per TTL, which is enough to cap cost.
const TTL_MS = 60_000;
let cache: { at: number; pending: Promise<HealthResult> | null } = { at: 0, pending: null };

async function check(): Promise<HealthResult> {
  try {
    // 1. Check Gemini Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { status: "offline", reason: "Missing GEMINI_API_KEY" };
    }

    // 2. Check Gemini Connectivity (fast metadata check, zero token consumption)
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.get({
      model: "gemini-3.8-flash",
      config: { abortSignal: AbortSignal.timeout(5000) }
    });

    // 3. Check Supabase Connectivity
    const { error } = await supabase.from("courses").select("id").limit(1);
    if (error) {
      return { status: "degraded", reason: "Database query failed: " + error.message };
    }

    return { status: "online" };
  } catch (error) {
    console.error("AI Health Check failed:", error);
    const reason = error instanceof Error ? error.message : String(error);
    return { status: "offline", reason };
  }
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = typeof token.role === "string" ? token.role : "";
  if (isTutorOnlyRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); // tutor mode only

  if (!cache.pending || Date.now() - cache.at > TTL_MS) {
    cache = { at: Date.now(), pending: check() };
  }
  return NextResponse.json(await cache.pending);
}
