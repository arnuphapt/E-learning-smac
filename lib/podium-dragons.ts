import { getDragonGrowthState, type DragonGrowthState } from "./dragon-growth.ts";

export interface PartnerDragonRow {
  user_id: string;
  species_id: string;
  points: number;
  hatched_at: string | null;
}

export interface PodiumDragonInfo {
  species_id: string;
  points: number;
  hatched_at: string | null;
  growth: DragonGrowthState;
}

/** Attach each top-3 player's partner dragon (with derived growth stage) or null. */
export function attachPodiumDragons<T extends { userId?: string }>(
  players: readonly T[],
  partnerRows: readonly PartnerDragonRow[]
): Array<T & { dragon: PodiumDragonInfo | null }> {
  const byUser = new Map<string, PodiumDragonInfo>();
  for (const row of partnerRows) {
    byUser.set(row.user_id, {
      species_id: row.species_id,
      points: row.points,
      hatched_at: row.hatched_at,
      growth: getDragonGrowthState(row.points, row.hatched_at !== null),
    });
  }

  return players.map((player) => ({
    ...player,
    dragon: player.userId ? (byUser.get(player.userId) ?? null) : null,
  }));
}
