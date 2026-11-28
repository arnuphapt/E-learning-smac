import { type NextRequest } from "next/server";
import { getLiveCaller, json } from "@/lib/live-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const rawBody: unknown = await req.json().catch(() => null);
    const rawDragonId =
      rawBody && typeof rawBody === "object" && "dragonId" in rawBody
        ? (rawBody as { dragonId?: unknown }).dragonId
        : undefined;
    const dragonId = typeof rawDragonId === "string" ? rawDragonId.trim() : "";

    if (!UUID_RE.test(dragonId)) {
      return json({ error: "รหัสไข่มังกรไม่ถูกต้อง" }, 400);
    }

    const { data, error } = await db.rpc("dragon_hatch", {
      p_user: callerId,
      p_dragon: dragonId,
    });

    if (error) {
      if (
        error.message?.includes("hatch_threshold_not_met") ||
        error.code === "P0004"
      ) {
        return json({ error: "แต้มยังไม่ถึงเกณฑ์ฟักไข่" }, 400);
      }
      if (
        error.message?.includes("dragon_not_found") ||
        error.code === "P0003"
      ) {
        return json({ error: "ไม่พบไข่มังกรนี้" }, 404);
      }
      throw error;
    }

    return json({ dragon: data });
  } catch (e) {
    console.error(
      "POST /api/dragon/hatch failed:",
      e instanceof Error ? e.message : e,
    );
    return json({ error: "ไม่สามารถฟักไข่ได้" }, 500);
  }
}
