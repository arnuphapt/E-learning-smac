import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";
import type { Database } from "@/lib/database.types";
import { supabaseAuthHeaders } from "@/lib/supabase-token";
import { isStaffRole, isTutorOnlyRole } from "@/lib/roles";

const CONFIG_KEYS = [
  "model",
  "daily_chat_limit",
  "session_token_limit",
  "max_output_tokens",
  "max_output_tokens_with_files",
] as const;

type ConfigKey = (typeof CONFIG_KEYS)[number];

const CONFIG_DEFAULTS: Record<ConfigKey, string> = {
  model: "gemini-3.8-flash",
  daily_chat_limit: "15",
  session_token_limit: "50000",
  max_output_tokens: "4096",
  max_output_tokens_with_files: "8192",
};

const isConfigKey = (k: string): k is ConfigKey =>
  (CONFIG_KEYS as readonly string[]).includes(k);

async function getSupabaseServerClient(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { global: { headers: supabaseAuthHeaders(token) } }
  );
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = typeof token.role === "string" ? token.role : "";
    if (isTutorOnlyRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); // tutor mode only
    const supabaseClient = await getSupabaseServerClient(req);
    const { data, error } = await supabaseClient
      .from("ai_settings")
      .select("key, value")
      .in("key", [...CONFIG_KEYS]);

    if (error && error.code !== "PGRST116") throw error;

    // Merge DB values with defaults
    const result: Record<ConfigKey, string> = { ...CONFIG_DEFAULTS };
    if (data) {
      data.forEach((row) => {
        if (isConfigKey(row.key)) {
          result[row.key] = row.value;
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to read AI config:", error);
    return NextResponse.json({ error: "Failed to read AI config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = typeof token?.role === "string" ? token.role : "";
    if (!token || !isStaffRole(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody: unknown = await req.json();
    const body =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? (rawBody as Record<string, unknown>)
        : {};
    const supabaseClient = await getSupabaseServerClient(req);

    // Validate and upsert each config key
    const updates: Array<{ key: ConfigKey; value: string }> = [];
    for (const key of CONFIG_KEYS) {
      if (body[key] !== undefined) {
        let val: string;
        if (key === "model") {
          val = String(body[key]).trim() || CONFIG_DEFAULTS.model;
        } else {
          val = String(parseInt(String(body[key]), 10) || CONFIG_DEFAULTS[key]);
        }
        updates.push({ key, value: val });
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid config keys provided" }, { status: 400 });
    }

    const { error } = await supabaseClient
      .from("ai_settings")
      .upsert(updates, { onConflict: "key" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update AI config:", error);
    return NextResponse.json({ error: "Failed to update AI config" }, { status: 500 });
  }
}
