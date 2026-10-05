import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";
import { supabaseAuthHeaders } from "@/lib/supabase-token";
import { isStaffRole } from "@/lib/roles";

const CONFIG_KEYS = [
  "daily_chat_limit",
  "session_token_limit",
  "max_output_tokens",
  "max_output_tokens_with_files",
];

const CONFIG_DEFAULTS = {
  daily_chat_limit: "15",
  session_token_limit: "20000",
  max_output_tokens: "2048",
  max_output_tokens_with_files: "4096",
};

async function getSupabaseServerClient(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const headers = supabaseAuthHeaders(token);
  if (token) {
    // ponytail: x-user-* only until the rls_jwt_claims DDL is applied; remove after.
    headers["x-user-id"] = token.dbId || token.sub;
    headers["x-user-role"] = token.role || "student";
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers } }
  );
}

export async function GET(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabaseClient = await getSupabaseServerClient(req);
    const { data, error } = await supabaseClient
      .from("ai_settings")
      .select("key, value")
      .in("key", CONFIG_KEYS);

    if (error && error.code !== "PGRST116") throw error;

    // Merge DB values with defaults
    const result = { ...CONFIG_DEFAULTS };
    if (data) {
      data.forEach((row) => {
        if (CONFIG_KEYS.includes(row.key)) {
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

export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !isStaffRole(token.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const supabaseClient = await getSupabaseServerClient(req);

    // Validate and upsert each config key
    const updates = [];
    for (const key of CONFIG_KEYS) {
      if (body[key] !== undefined) {
        const val = String(parseInt(body[key], 10) || CONFIG_DEFAULTS[key]);
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
