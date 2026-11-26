import { type NextRequest } from "next/server";
import { getLiveCaller, json } from "@/lib/live-server";
import {
  getDragonGrowthState,
  MAX_DRAGON_POINTS,
  type DragonGrowthState,
} from "@/lib/dragon-growth";

export interface DragonMeItem {
  id: string;
  species_id: string;
  points: number;
  is_partner: boolean;
  created_at: string;
  growth: DragonGrowthState;
}

export async function GET(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const [{ data: dragonRows, error: dErr }, { data: walletRow, error: wErr }] =
      await Promise.all([
        db
          .from("dragons")
          .select("id, species_id, points, is_partner, created_at")
          .eq("user_id", callerId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false }),
        db
          .from("dragon_wallets")
          .select("balance, lifetime")
          .eq("user_id", callerId)
          .maybeSingle(),
      ]);

    if (dErr) throw dErr;
    if (wErr) throw wErr;

    const dragons: DragonMeItem[] = (dragonRows ?? []).map((row) => ({
      id: row.id,
      species_id: row.species_id,
      points: row.points,
      is_partner: row.is_partner,
      created_at: row.created_at,
      growth: getDragonGrowthState(row.points),
    }));

    // Rows are ordered newest-first; the first dragon below MAX_DRAGON_POINTS is the growing one.
    const growingDragonId =
      dragons.find((d) => d.points < MAX_DRAGON_POINTS)?.id ?? null;

    const wallet = {
      balance: walletRow?.balance ?? 0,
      lifetime: walletRow?.lifetime ?? 0,
    };

    return json({ dragons, wallet, growingDragonId });
  } catch (e) {
    console.error("GET /api/dragon/me failed:", e instanceof Error ? e.message : e);
    return json({ error: "Failed to load dragon data" }, 500);
  }
}
