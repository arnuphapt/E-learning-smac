import { type NextRequest } from "next/server";
import { getLiveCaller, json } from "@/lib/live-server";
import { getMyPlayedHubs } from "@/lib/hub-dragons";

export async function GET(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const hubs = await getMyPlayedHubs(db, callerId);
    return json({ hubs });
  } catch (e) {
    console.error("GET /api/live/hubs/mine failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถโหลดรายการ hub ได้" }, 500);
  }
}
