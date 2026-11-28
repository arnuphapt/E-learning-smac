import { type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { isStaffRole } from "@/lib/roles";
import { json, getLiveCaller, readLiveRows } from "@/lib/live-server";
import { parseHubName, parseYearLevel } from "@/lib/live-hubs";

type LiveHubRow = Database["public"]["Tables"]["live_hubs"]["Row"];

interface CreateHubBody {
  name?: unknown;
  year_level?: unknown;
}

export async function GET(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser } = caller;

    if (!isStaffRole(dbUser.role)) {
      return json({ error: "ไม่มีสิทธิ์เข้าถึง" }, 403);
    }

    const { data: hubs, error: hErr } = await readLiveRows<LiveHubRow>(() =>
      db
        .from("live_hubs")
        .select("id, host_id, name, year_level, created_at, updated_at")
        .eq("host_id", callerId)
        .order("created_at", { ascending: false })
        .order("id")
    );
    if (hErr || !hubs) throw hErr;

    if (hubs.length === 0) {
      return json([]);
    }

    const hubIds = hubs.map((h) => h.id);
    const [
      { data: sessions, error: sErr },
      { data: members, error: mErr },
    ] = await Promise.all([
      readLiveRows<{ hub_id: string | null }>(() =>
        db
          .from("live_sessions")
          .select("hub_id")
          .in("hub_id", hubIds)
          .order("id")
      ),
      readLiveRows<{ hub_id: string }>(() =>
        db
          .from("live_hub_members")
          .select("hub_id")
          .in("hub_id", hubIds)
          .order("hub_id")
          .order("user_id")
      ),
    ]);
    if (sErr || !sessions) throw sErr;
    if (mErr || !members) throw mErr;

    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.hub_id) counts.set(s.hub_id, (counts.get(s.hub_id) ?? 0) + 1);
    }
    const memberCounts = new Map<string, number>();
    for (const m of members) {
      memberCounts.set(m.hub_id, (memberCounts.get(m.hub_id) ?? 0) + 1);
    }

    return json(
      hubs.map((h) => ({
        ...h,
        room_count: counts.get(h.id) ?? 0,
        member_count: memberCounts.get(h.id) ?? 0,
      }))
    );
  } catch (e) {
    console.error("Live hubs list failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถโหลดรายการ hub ได้" }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser } = caller;

    if (!isStaffRole(dbUser.role)) {
      return json({ error: "ไม่มีสิทธิ์สร้าง hub" }, 403);
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as CreateHubBody;

    const nameRes = parseHubName(body.name);
    if (!nameRes.ok) return json({ error: nameRes.error }, 400);

    const yearRes = body.year_level === undefined ? { ok: true as const, value: [] } : parseYearLevel(body.year_level);
    if (!yearRes.ok) return json({ error: yearRes.error }, 400);

    const { data: created, error: cErr } = await db
      .from("live_hubs")
      .insert({
        host_id: callerId,
        name: nameRes.value,
        year_level: yearRes.value,
      })
      .select("id, host_id, name, year_level, created_at, updated_at")
      .single();
    if (cErr) throw cErr;

    return json({ ...created, room_count: 0 }, 201);
  } catch (e) {
    console.error("Live hub create failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถสร้าง hub ได้" }, 500);
  }
}
