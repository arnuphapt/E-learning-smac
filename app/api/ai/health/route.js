import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

// Every call used to hit Gemini. Share one result (and one in-flight check) across all callers for TTL_MS.
// ponytail: per-instance memory; on serverless each warm instance checks once per TTL, which is enough to cap cost.
const TTL_MS = 60_000;
let cache = { at: 0, pending: null };

async function check() {
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
    return { status: "offline", reason: error.message };
  }
}

export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!cache.pending || Date.now() - cache.at > TTL_MS) {
    cache = { at: Date.now(), pending: check() };
  }
  return NextResponse.json(await cache.pending);
}
