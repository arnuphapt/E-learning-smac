import { getDragonGrowthState } from "./dragon-growth.ts";

export interface DragonSceneInputItem {
  id?: string;
  species_id: string;
  points: number;
  created_at?: string | null;
  hatched_at?: string | null;
  is_partner?: boolean;
}

export interface DragonMapItem {
  GUID: string;
  SymbolID: string;
  LayerID?: string;
  XPos?: number;
  YPos?: number;
  ZPos?: number;
  isMarker?: boolean;
}

export interface DragonSourceMap {
  MapItemData: readonly DragonMapItem[];
}

export interface HatcheryActiveEggV2 {
  id: string;
  speciesId: string;
  slotGUID: string;
  phase: "summoning" | "incubating";
  summonAt?: number;
  summonDoneAt?: number;
  appearanceAt?: number;
  startedAt: number;
  readyAt: number;
  isPartner?: boolean;
}

export interface HatcheryBabyV2 {
  id: string;
  speciesId: string;
  slotGUID: string;
  hatchedAt: number;
  /** View-only extension: render this nursery entry as an egg. */
  isEgg?: true;
  isPartner?: boolean;
}

export interface HatcheryAdultV2 {
  id: string;
  speciesId: string;
  originSlotGUID: string;
  perchGUID: string;
  perchReserved: boolean;
  flightPosition?: {
    x: number;
    y: number;
    z: number;
    layerID: string;
  };
  maturedAt: number;
  hoverUntil: number;
  flyUntil: number;
  nectar: number;
  coinStampedAt: number;
  isPartner?: boolean;
}

export interface HatcherySaveV2 {
  version: 2;
  summoned: number;
  active: HatcheryActiveEggV2 | null;
  babies: HatcheryBabyV2[];
  adults: HatcheryAdultV2[];
}

const PAST_READY_AT = 0;
const FAR_FUTURE_READY_AT = 9_999_999_999_999;
export const SUMMON_DURATION_MS = 6_800;
export const ARRIVAL_DURATION_MS = 2_000;

/** Build a v2 hatchery save whose active egg starts in `phase: "summoning"` for the first-join lobby effect. */
export function toSummoningHatcherySave(
  dragon: DragonSceneInputItem,
  map: DragonSourceMap,
  nowMs = Date.now()
): HatcherySaveV2 {
  const { slots } = extractDragonMapMarkers(map);
  if (slots.length === 0) {
    throw new Error("Source map has no Egg_Slot markers");
  }
  const summonAt = nowMs;
  const summonDoneAt = summonAt + SUMMON_DURATION_MS;
  const startedAt = summonDoneAt + ARRIVAL_DURATION_MS;
  return {
    version: 2,
    summoned: 1,
    active: {
      id: dragon.id || "dragon-0",
      speciesId: dragon.species_id,
      slotGUID: slots[0].GUID,
      phase: "summoning",
      summonAt,
      summonDoneAt,
      appearanceAt: summonDoneAt,
      startedAt,
      readyAt: FAR_FUTURE_READY_AT,
      isPartner: Boolean(dragon.is_partner),
    },
    babies: [],
    adults: [],
  };
}

function sortNewestFirst(
  items: readonly DragonSceneInputItem[]
): DragonSceneInputItem[] {
  return items
    .map((item, idx) => ({
      item,
      idx,
      ts: item.created_at ? Date.parse(item.created_at) : Number.NaN,
    }))
    .sort((a, b) => {
      const aValid = Number.isFinite(a.ts);
      const bValid = Number.isFinite(b.ts);
      if (aValid && bValid && b.ts !== a.ts) return b.ts - a.ts;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.idx - b.idx;
    })
    .map((entry) => entry.item);
}

/** Extract ordered Egg_Slot markers and PerchMarker_* markers from a source map. */
export function extractDragonMapMarkers(map: DragonSourceMap): {
  slots: DragonMapItem[];
  perches: DragonMapItem[];
} {
  const incubator = map.MapItemData.find(
    (item) => item.SymbolID === "IncubatorEggMarker"
  );
  const incX = incubator?.XPos ?? 0;
  const incY = incubator?.YPos ?? 0;

  const slots = map.MapItemData.filter(
    (item) => item.isMarker && item.SymbolID === "Egg_Slot"
  ).sort(
    (a, b) =>
      Math.hypot((a.XPos ?? 0) - incX, (a.YPos ?? 0) - incY) -
      Math.hypot((b.XPos ?? 0) - incX, (b.YPos ?? 0) - incY)
  );

  const perches = map.MapItemData.filter(
    (item) =>
      item.isMarker &&
      (item.SymbolID === "PerchMarker_Branch" ||
        item.SymbolID === "PerchMarker_Ground")
  );

  return { slots, perches };
}

/**
 * Convert a list of DB dragon records into the v2 persisted save format
 * expected by `lib/dragon/hatchery.mjs`.
 *
 * Nursery capacity rule: `active` (newest egg, if any) + `babies` (remaining
 * eggs, flagged `isEgg`, and babies) share `Egg_Slot` capacity; if total eggs + babies exceed
 * `slots.length`, only the newest `slots.length` are kept.
 */
export function toHatcherySave(
  dragons: readonly DragonSceneInputItem[],
  map: DragonSourceMap,
  options?: { summoningDragonId?: string | null; nowMs?: number }
): HatcherySaveV2 {
  const { slots, perches } = extractDragonMapMarkers(map);

  const ordered = sortNewestFirst(dragons);
  const eggs: Array<{ item: DragonSceneInputItem; id: string; readyToHatch: boolean }> = [];
  const babiesList: Array<{ item: DragonSceneInputItem; id: string }> = [];
  const adultsList: Array<{
    item: DragonSceneInputItem;
    id: string;
  }> = [];

  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    const id = item.id || `dragon-${i}`;
    const hatched = item.hatched_at !== null;
    const growth = getDragonGrowthState(item.points, hatched);
    if (growth.stage === "egg") {
      eggs.push({ item, id, readyToHatch: growth.readyToHatch });
    } else if (growth.stage === "baby") {
      babiesList.push({ item, id });
    } else {
      adultsList.push({ item, id });
    }
  }

  const nurseryCandidates = [
    ...eggs.map((e) => ({ ...e, isEgg: true })),
    ...babiesList.map((b) => ({ ...b, isEgg: false })),
  ];
  const keptNursery =
    nurseryCandidates.length > slots.length
      ? sortNewestFirst(nurseryCandidates.map((c) => c.item)).slice(
          0,
          slots.length
        )
      : null;

  const keptSet = keptNursery ? new Set(keptNursery) : null;
  const keptEggs = keptSet ? eggs.filter((e) => keptSet.has(e.item)) : eggs;
  const keptBabies = keptSet
    ? babiesList.filter((b) => keptSet.has(b.item))
    : babiesList;

  if ((keptEggs.length > 0 || keptBabies.length > 0 || adultsList.length > 0) && slots.length === 0) {
    throw new Error("Source map has no Egg_Slot markers");
  }
  if (adultsList.length > 0 && perches.length === 0) {
    throw new Error("Source map has no PerchMarker_* markers");
  }

  let slotCursor = 0;
  let active: HatcheryActiveEggV2 | null = null;
  const babies: HatcheryBabyV2[] = [];

  if (keptEggs.length > 0) {
    const [firstEgg, ...extraEggs] = keptEggs;
    const isSummoning =
      Boolean(options?.summoningDragonId) &&
      firstEgg.id === options?.summoningDragonId;
    if (isSummoning) {
      const summonAt = options?.nowMs ?? Date.now();
      const summonDoneAt = summonAt + SUMMON_DURATION_MS;
      active = {
        id: firstEgg.id,
        speciesId: firstEgg.item.species_id,
        slotGUID: slots[slotCursor++].GUID,
        phase: "summoning",
        summonAt,
        summonDoneAt,
        appearanceAt: summonDoneAt,
        startedAt: summonDoneAt + ARRIVAL_DURATION_MS,
        readyAt: FAR_FUTURE_READY_AT,
        isPartner: Boolean(firstEgg.item.is_partner),
      };
    } else {
      active = {
        id: firstEgg.id,
        speciesId: firstEgg.item.species_id,
        slotGUID: slots[slotCursor++].GUID,
        phase: "incubating",
        startedAt: 0,
        readyAt: firstEgg.readyToHatch ? PAST_READY_AT : FAR_FUTURE_READY_AT,
        isPartner: Boolean(firstEgg.item.is_partner),
      };
    }
    // Extra eggs ride in nursery slots; `isEgg` makes the renderer draw eggs.
    for (const extra of extraEggs) {
      babies.push({
        id: extra.id,
        speciesId: extra.item.species_id,
        slotGUID: slots[slotCursor++].GUID,
        hatchedAt: 0,
        isEgg: true,
        isPartner: Boolean(extra.item.is_partner),
      });
    }
  }

  for (const baby of keptBabies) {
    babies.push({
      id: baby.id,
      speciesId: baby.item.species_id,
      slotGUID: slots[slotCursor++].GUID,
      hatchedAt: 0,
      isPartner: Boolean(baby.item.is_partner),
    });
  }

  const adults: HatcheryAdultV2[] = adultsList.map((adult, index) => {
    const originSlot = slots[index % slots.length];
    if (index < perches.length) {
      return {
        id: adult.id,
        speciesId: adult.item.species_id,
        originSlotGUID: originSlot.GUID,
        perchGUID: perches[index].GUID,
        perchReserved: true,
        maturedAt: 0,
        hoverUntil: 0,
        flyUntil: 0,
        nectar: 0,
        coinStampedAt: 0,
        isPartner: Boolean(adult.item.is_partner),
      };
    }

    const fallbackPerch = perches[index % perches.length];
    return {
      id: adult.id,
      speciesId: adult.item.species_id,
      originSlotGUID: originSlot.GUID,
      perchGUID: fallbackPerch.GUID,
      perchReserved: false,
      flightPosition: {
        x: fallbackPerch.XPos ?? 0,
        y: fallbackPerch.YPos ?? 0,
        z: fallbackPerch.ZPos ?? 0,
        layerID: fallbackPerch.LayerID ?? "PerchMarkers",
      },
      maturedAt: 0,
      hoverUntil: 0,
      flyUntil: 0,
      nectar: 0,
      coinStampedAt: 0,
      isPartner: Boolean(adult.item.is_partner),
    };
  });

  return {
    version: 2,
    summoned: dragons.length,
    active,
    babies,
    adults,
  };
}
