import { type NextRequest } from "next/server";
import { getLiveCaller, json } from "@/lib/live-server";

export async function POST(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const { data: dragonId, error } = await db.rpc("dragon_buy_egg", {
      p_user: callerId,
    });

    if (error) {
      if (error.message?.includes("incubator_occupied") || error.code === "P0002") {
        return json(
          { error: "ยังมีไข่ที่ยังไม่ฟัก ฟักไข่ใบเดิมก่อนจึงจะสุ่มไข่ใบใหม่ได้" },
          409,
        );
      }
      if (error.message?.includes("insufficient_balance") || error.code === "P0001") {
        return json({ error: "แต้มไม่พอ" }, 400);
      }
      throw error;
    }

    if (!dragonId) {
      throw new Error("dragon_buy_egg returned null");
    }

    // The purchase is already committed: return right away so a failed
    // follow-up read can never turn a charged purchase into a 500 (and a retry).
    // Clients refetch /api/dragon/me for the new state.
    return json({ dragon_id: dragonId }, 201);
  } catch (e) {
    console.error("POST /api/dragon/egg failed:", e instanceof Error ? e.message : e);
    return json({ error: "ไม่สามารถสุ่มไข่ใบใหม่ได้" }, 500);
  }
}
