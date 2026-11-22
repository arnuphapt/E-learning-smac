import { NextResponse } from "next/server";
import { getToken, type GetTokenParams, type JWT } from "next-auth/jwt";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasRole } from "@/lib/roles";

export const NO_STORE = { "Cache-Control": "no-store" } as const;
export const json = (body: unknown, status = 200): NextResponse =>
  NextResponse.json(body, { status, headers: NO_STORE });

// Callers supply a fresh query with a stable, unique ordering for every page.
export async function readLiveRows<T, E = unknown>(
  query: () => {
    range(
      from: number,
      to: number
    ): PromiseLike<{ data: T[] | null; error: E | null }>;
  }
): Promise<{ data: T[]; error: null } | { data: null; error: E }> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query().range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}

export interface LiveCallerUser {
  id: string;
  role: string | null;
  name: string;
}

export type LiveCallerResult =
  | { error: NextResponse }
  | {
      error?: undefined;
      db: SupabaseClient<Database>;
      callerId: string;
      dbUser: LiveCallerUser;
      token: JWT;
    };

export async function getLiveCaller(
  req: GetTokenParams["req"]
): Promise<LiveCallerResult> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return { error: json({ error: "Unauthorized" }, 401) };

  const callerId =
    typeof token.dbId === "string" && token.dbId
      ? token.dbId
      : typeof token.sub === "string"
        ? token.sub
        : "";
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
