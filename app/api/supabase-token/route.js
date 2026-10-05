import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { mintSupabaseToken } from "@/lib/supabase-token";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Session-gated: exchanges the NextAuth session for a short-lived Supabase JWT.
// The role in the minted JWT is re-read from the DB on every mint (not the possibly stale
// NextAuth token), so a demoted/deleted user loses access within the 1h token TTL.
export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data: user, error } = await supabaseAdmin()
      .from("users")
      .select("id, role")
      .eq("id", token.dbId || token.sub)
      .maybeSingle();
    if (error) throw error;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(mintSupabaseToken({ dbId: user.id, role: user.role }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Failed to mint Supabase token:", e.message);
    return NextResponse.json({ error: "Token unavailable" }, { status: 500 });
  }
}
