import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasRole } from "@/lib/roles";

export const NO_STORE = { "Cache-Control": "no-store" };
export const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE });

// Callers supply a fresh query with a stable, unique ordering for every page.
export async function readLiveRows(query) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query().range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}

export async function getLiveCaller(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return { error: json({ error: "Unauthorized" }, 401) };

  const callerId = token.dbId || token.sub;
  const db = supabaseAdmin();

  const { data: dbUser, error: uErr } = await db
    .from("users")
    .select("id, role, name")
    .eq("id", callerId)
    .maybeSingle();
  if (uErr) throw uErr;
  if (!dbUser) return { error: json({ error: "Unauthorized" }, 401) };

  if (hasRole(dbUser.role, "tutor_guest")) {
    return { error: json({ error: "Forbidden" }, 403) };
  }

  return { db, callerId, dbUser, token };
}
