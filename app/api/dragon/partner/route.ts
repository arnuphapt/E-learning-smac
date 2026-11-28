import { type NextRequest } from "next/server";
import { getLiveCaller, json } from "@/lib/live-server";

interface SetPartnerBody {
  dragon_id?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const rawBody: unknown = await req.json().catch(() => null);
    const { dragon_id } = (
      rawBody && typeof rawBody === "object" ? rawBody : {}
    ) as SetPartnerBody;

    if (typeof dragon_id !== "string" || !UUID_RE.test(dragon_id)) {
      return json({ error: "ไม่พบมังกร" }, 400);
    }

    const { data, error } = await db.rpc("dragon_set_partner", {
      p_user: callerId,
      p_dragon: dragon_id,
    });
    if (error) throw error;

    if (data === "not_found") {
      return json({ error: "ไม่พบมังกร" }, 404);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("POST /api/dragon/partner failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถเลือกมังกรคู่ใจได้" }, 500);
  }
}
