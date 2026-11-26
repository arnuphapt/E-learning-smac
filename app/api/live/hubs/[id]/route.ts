import { type NextRequest } from "next/server";
import { isStaffRole } from "@/lib/roles";
import { json, getLiveCaller, readLiveRows } from "@/lib/live-server";
import { parseHubName, parseYearLevel } from "@/lib/live-hubs";

interface PatchHubBody {
  name?: unknown;
  year_level?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser } = caller;

    if (!isStaffRole(dbUser.role)) {
      return json({ error: "ไม่มีสิทธิ์เข้าถึง" }, 403);
    }

    const { id } = await params;
    if (!id || !UUID_RE.test(id)) {
      return json({ error: "ไม่พบ hub" }, 404);
    }

    const { data: hub, error: hErr } = await db
      .from("live_hubs")
      .select("id, host_id, name, year_level, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (hErr) throw hErr;

    if (!hub) {
      return json({ error: "ไม่พบ hub" }, 404);
    }
    if (hub.host_id !== callerId) {
      return json({ error: "ไม่มีสิทธิ์เข้าถึง hub นี้" }, 403);
    }

    const { data: sessions, error: sErr } = await readLiveRows<{ id: string }>(() =>
      db
        .from("live_sessions")
        .select("id")
        .eq("hub_id", id)
        .order("id")
    );
    if (sErr || !sessions) throw sErr;

    return json({ ...hub, room_count: sessions.length });
  } catch (e) {
    console.error("Live hub fetch failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถโหลดข้อมูล hub ได้" }, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser } = caller;

    if (!isStaffRole(dbUser.role)) {
      return json({ error: "ไม่มีสิทธิ์แก้ไข hub" }, 403);
    }

    const { id } = await params;
    if (!id || !UUID_RE.test(id)) {
      return json({ error: "ไม่พบ hub" }, 404);
    }

    const { data: existing, error: hErr } = await db
      .from("live_hubs")
      .select("id, host_id")
      .eq("id", id)
      .maybeSingle();
    if (hErr) throw hErr;

    if (!existing) {
      return json({ error: "ไม่พบ hub" }, 404);
    }
    if (existing.host_id !== callerId) {
      return json({ error: "ไม่มีสิทธิ์แก้ไข hub นี้" }, 403);
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as PatchHubBody;

    const patch: { name?: string; year_level?: number[]; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    let hasField = false;

    if (body.name !== undefined) {
      const nameRes = parseHubName(body.name);
      if (!nameRes.ok) return json({ error: nameRes.error }, 400);
      patch.name = nameRes.value;
      hasField = true;
    }

    if (body.year_level !== undefined) {
      const yearRes = parseYearLevel(body.year_level);
      if (!yearRes.ok) return json({ error: yearRes.error }, 400);
      patch.year_level = yearRes.value;
      hasField = true;
    }

    if (!hasField) {
      return json({ error: "ไม่มีข้อมูลที่ต้องการแก้ไข" }, 400);
    }

    const { data: updated, error: uErr } = await db
      .from("live_hubs")
      .update(patch)
      .eq("id", id)
      .eq("host_id", callerId)
      .select("id, host_id, name, year_level, created_at, updated_at")
      .single();
    if (uErr) throw uErr;

    return json(updated);
  } catch (e) {
    console.error("Live hub update failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถแก้ไข hub ได้" }, 500);
  }
}
