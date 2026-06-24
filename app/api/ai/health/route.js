import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // 1. Check Gemini Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ status: "offline", reason: "Missing GEMINI_API_KEY" });
    }

    // 2. Check Gemini Connectivity (fast lightweight ping)
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "healthcheck",
      config: { maxOutputTokens: 2 }
    });

    // 3. Check Supabase Connectivity
    const { error } = await supabase.from("courses").select("id").limit(1);
    if (error) {
      return NextResponse.json({ status: "degraded", reason: "Database query failed: " + error.message });
    }

    return NextResponse.json({ status: "online" });
  } catch (error) {
    console.error("AI Health Check failed:", error);
    return NextResponse.json({ status: "offline", reason: error.message });
  }
}
