import { type NextRequest } from "next/server";
import { getLiveCaller, json } from "@/lib/live-server";
import { getHubDragons } from "@/lib/hub-dragons";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const { id } = await params;
    if (!id || !UUID_RE.test(id)) {
      return json({ error: "ไม่พบ hub" }, 404);
    }

    const result = await getHubDragons(db, id, callerId);
    if (result.status !== 200) {
      return json({ error: result.error }, result.status);
    }

    return json(result.data);
  } catch (e) {
    console.error("GET /api/live/hubs/[id]/dragons failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถโหลดข้อมูลมังกรของ hub ได้" }, 500);
  }
}
