import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";
import {
  getDragonGrowthState,
  type DragonGrowthState,
} from "./dragon-growth.ts";

export const HUB_SCENE_DRAGON_LIMIT = 40;

export interface HubDragonSceneItem {
  species_id: string;
  points: number;
  hatched_at: string | null;
  growth: DragonGrowthState;
}

export interface HubDragonsResult {
  hub: {
    id: string;
    name: string;
    year_level: number[];
  };
  total_members: number;
  dragons: HubDragonSceneItem[];
}

export type GetHubDragonsResponse =
  | { status: 200; data: HubDragonsResult }
  | { status: 403; error: string }
  | { status: 404; error: string };

export interface PlayedHubItem {
  id: string;
  name: string;
  year_level: number[];
  first_played_at: string;
  member_count: number;
}

async function fetchAllRows<T>(
  query: () => {
    range(
      from: number,
      to: number
    ): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  }
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query().range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (data) rows.push(...data);
    if (!data || data.length < pageSize) return rows;
  }
}

/**
 * Fetch up to 40 partner dragons of a hub's members, ordered by most recent
 * play in the hub (`dragon_point_grants.granted_at` on hub sessions, falling
 * back to `live_hub_members.first_played_at`). Only the hub owner or a hub
 * member may view it. Never returns personal fields (`user_id`, `name`, `email`).
 */
export async function getHubDragons(
  db: SupabaseClient<Database>,
  hubId: string,
  callerId: string
): Promise<GetHubDragonsResponse> {
  const { data: hub, error: hErr } = await db
    .from("live_hubs")
    .select("id, host_id, name, year_level")
    .eq("id", hubId)
    .maybeSingle();
  if (hErr) throw hErr;
  if (!hub) return { status: 404, error: "ไม่พบ hub" };

  if (hub.host_id !== callerId) {
    const { data: membership, error: mErr } = await db
      .from("live_hub_members")
      .select("user_id")
      .eq("hub_id", hubId)
      .eq("user_id", callerId)
      .maybeSingle();
    if (mErr) throw mErr;
    if (!membership) {
      return { status: 403, error: "ไม่มีสิทธิ์เข้าถึง hub นี้" };
    }
  }

  // Ordering (latest play first) and the 40-dragon LIMIT run in SQL.
  const { data: rawScene, error: sErr } = await db.rpc("dragon_hub_scene", {
    p_hub: hubId,
    p_limit: HUB_SCENE_DRAGON_LIMIT,
  });
  if (sErr) throw new Error(sErr.message);

  const scene =
    rawScene && typeof rawScene === "object" && !Array.isArray(rawScene)
      ? (rawScene as {
          total_members?: number;
          dragons?: Array<{ species_id: string; points: number; hatched_at?: string | null }>;
        })
      : null;

  const totalMembers = scene?.total_members ?? 0;
  const dragons: HubDragonSceneItem[] = (scene?.dragons ?? []).map((d) => {
    const hatchedAt = d.hatched_at ?? null;
    return {
      species_id: d.species_id,
      points: d.points,
      hatched_at: hatchedAt,
      growth: getDragonGrowthState(d.points, hatchedAt !== null),
    };
  });

  return {
    status: 200,
    data: {
      hub: { id: hub.id, name: hub.name, year_level: hub.year_level },
      total_members: totalMembers,
      dragons,
    },
  };
}

/** List hubs the caller has played in, ordered by most recently joined. */
export async function getMyPlayedHubs(
  db: SupabaseClient<Database>,
  callerId: string
): Promise<PlayedHubItem[]> {
  const { data: memberships, error: mErr } = await db
    .from("live_hub_members")
    .select("hub_id, first_played_at")
    .eq("user_id", callerId)
    .order("first_played_at", { ascending: false });
  if (mErr) throw mErr;
  if (!memberships || memberships.length === 0) return [];

  const hubIds = memberships.map((m) => m.hub_id);
  const [{ data: hubs, error: hErr }, allMemberRows] = await Promise.all([
    db.from("live_hubs").select("id, name, year_level").in("id", hubIds),
    fetchAllRows<{ hub_id: string }>(() =>
      db
        .from("live_hub_members")
        .select("hub_id")
        .in("hub_id", hubIds)
        .order("hub_id", { ascending: true })
    ),
  ]);
  if (hErr) throw hErr;

  const hubMap = new Map((hubs ?? []).map((h) => [h.id, h]));
  const countMap = new Map<string, number>();
  for (const row of allMemberRows) {
    countMap.set(row.hub_id, (countMap.get(row.hub_id) ?? 0) + 1);
  }

  const result: PlayedHubItem[] = [];
  for (const m of memberships) {
    const hub = hubMap.get(m.hub_id);
    if (!hub) continue;
    result.push({
      id: hub.id,
      name: hub.name,
      year_level: hub.year_level,
      first_played_at: m.first_played_at,
      member_count: countMap.get(hub.id) ?? 0,
    });
  }
  return result;
}
