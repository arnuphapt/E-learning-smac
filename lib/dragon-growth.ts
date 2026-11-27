export type DragonStage = "egg" | "baby" | "adult";
export type DragonLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface DragonGrowthState {
  stage: DragonStage;
  level: DragonLevel;
  nextAt: number | null;
  toNext: number;
  readyToHatch: boolean;
}

export interface DragonPointGrantResult {
  newPoints: number;
  overflow: number;
}

export const DRAGON_GROWTH_THRESHOLDS = {
  hatch: 1_000,
  adult: 5_000,
  levels: [10_000, 20_000, 35_000, 55_000, 80_000] as const,
  eggPrice: 20_000,
} as const;

export const MAX_DRAGON_POINTS =
  DRAGON_GROWTH_THRESHOLDS.levels[DRAGON_GROWTH_THRESHOLDS.levels.length - 1];

function assertNonNegativeInt(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer, got ${value}`);
  }
}

/** Derive a dragon's stage, level (0-5), hatch readiness, and points needed for the next step. */
export function getDragonGrowthState(
  points: number,
  hatched = true
): DragonGrowthState {
  assertNonNegativeInt(points, "points");

  const { hatch, adult, levels } = DRAGON_GROWTH_THRESHOLDS;

  if (!hatched) {
    return {
      stage: "egg",
      level: 0,
      nextAt: hatch,
      toNext: Math.max(0, hatch - points),
      readyToHatch: points >= hatch,
    };
  }

  if (points < hatch) {
    return {
      stage: "egg",
      level: 0,
      nextAt: hatch,
      toNext: hatch - points,
      readyToHatch: false,
    };
  }
  if (points < adult) {
    return {
      stage: "baby",
      level: 0,
      nextAt: adult,
      toNext: adult - points,
      readyToHatch: false,
    };
  }

  for (let i = 0; i < levels.length; i++) {
    const threshold = levels[i];
    if (points < threshold) {
      return {
        stage: "adult",
        level: i as DragonLevel,
        nextAt: threshold,
        toNext: threshold - points,
        readyToHatch: false,
      };
    }
  }

  return {
    stage: "adult",
    level: 5,
    nextAt: null,
    toNext: 0,
    readyToHatch: false,
  };
}

/** Split a quiz-point grant into capped dragon points (up to level 5) and wallet overflow. */
export function applyDragonPointGrant(
  currentPoints: number,
  grantPoints: number
): DragonPointGrantResult {
  assertNonNegativeInt(currentPoints, "currentPoints");
  assertNonNegativeInt(grantPoints, "grantPoints");

  const total = currentPoints + grantPoints;
  if (total <= MAX_DRAGON_POINTS) {
    return { newPoints: total, overflow: 0 };
  }

  const overflow = Math.min(grantPoints, total - MAX_DRAGON_POINTS);
  return { newPoints: MAX_DRAGON_POINTS, overflow };
}

/** Check whether a student's wallet balance can buy a new dragon egg. */
export function canBuyDragonEgg(balance: number): boolean {
  assertNonNegativeInt(balance, "balance");
  return balance >= DRAGON_GROWTH_THRESHOLDS.eggPrice;
}

export const READY_TO_HATCH_SUMMARY_THAI =
  "ไข่พร้อมฟักแล้ว ไปกดฟักที่หน้ามังกร";

/** Format a dragon's stage/level in Thai for UI badges and summaries. */
export function formatDragonGrowthThai(growth: DragonGrowthState): string {
  if (growth.stage === "egg") {
    return growth.readyToHatch ? "ไข่ (พร้อมฟัก)" : "ไข่";
  }
  if (growth.stage === "baby") return "ลูกมังกร";
  return `ตัวเต็มวัย เลเวล ${growth.level}`;
}

export interface DragonGrantSummary {
  points: number;
  /** null when the grant predates persisted outcomes or no dragon could grow. */
  before: DragonGrowthState | null;
  after: DragonGrowthState | null;
  first_egg: boolean;
  overflow: number;
  message: string | null;
}

/**
 * Build the post-room summary from the outcome persisted by
 * `dragon_grant_session` (`dragon_point_grants` columns). Rows written before
 * those columns existed have nulls: no stage-change claim, just the points.
 */
export function summarizeDragonPointGrant({
  points,
  pointsBefore,
  pointsAfter,
  overflow,
  firstEgg,
  hatched = true,
}: {
  points: number;
  pointsBefore: number | null;
  pointsAfter: number | null;
  overflow: number | null;
  firstEgg: boolean | null;
  hatched?: boolean;
}): DragonGrantSummary {
  assertNonNegativeInt(points, "points");
  const known = pointsBefore !== null && pointsAfter !== null;
  const before = known ? getDragonGrowthState(pointsBefore, hatched) : null;
  const after = known ? getDragonGrowthState(pointsAfter, hatched) : null;
  return {
    points,
    before,
    after,
    first_egg: known && firstEgg === true,
    overflow: overflow ?? 0,
    message: after?.readyToHatch ? READY_TO_HATCH_SUMMARY_THAI : null,
  };
}
