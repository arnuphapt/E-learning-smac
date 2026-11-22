/**
 * LIVE QUIZ ASSET MAP
 *
 * NOTE: All paths under /live/dev/ are development-only placeholders and are gitignored.
 * Before deploying to production, all assets MUST be replaced with licensed or original
 * assets placed under /live/ and credited in public/live/CREDITS.md.
 * See spec 'Asset' section and deploy gate test in tests/live.test.js.
 */

// In-memory cache for asset existence checks (URL -> boolean)
const assetCache = new Map<string, boolean>();

/**
 * Checks whether an asset exists via HEAD fetch.
 * Cached in memory, returns false on any network or HTTP error.
 * Lazy & safe to import in Node or SSR without touching browser APIs.
 */
export async function assetExists(url: string | null | undefined): Promise<boolean> {
  if (!url || typeof url !== 'string') return false;
  if (assetCache.has(url)) return assetCache.get(url) ?? false;
  if (typeof fetch === 'undefined') return false;

  try {
    const res = await fetch(url, { method: 'HEAD' });
    const exists = res.ok;
    assetCache.set(url, exists);
    return exists;
  } catch {
    assetCache.set(url, false);
    return false;
  }
}

export interface SpeciesAsset {
  skel: string;
  atlas: string;
}

/**
 * 6 Dragon Species Spine assets under /live/dev/spine/
 */
export const species = {
  Classic: {
    skel: '/live/dev/spine/Classic_1/Classic_1.skel',
    atlas: '/live/dev/spine/Classic_1/Classic_1.atlas',
  },
  GemDragon: {
    skel: '/live/dev/spine/GemDragon_1/GemDragon_1.skel',
    atlas: '/live/dev/spine/GemDragon_1/GemDragon_1.atlas',
  },
  Wyvern: {
    skel: '/live/dev/spine/Wyvern_1/Wyvern_1.skel',
    atlas: '/live/dev/spine/Wyvern_1/Wyvern_1.atlas',
  },
  Cat: {
    skel: '/live/dev/spine/Cat_1/Cat_1.skel',
    atlas: '/live/dev/spine/Cat_1/Cat_1.atlas',
  },
  Loong: {
    skel: '/live/dev/spine/Loong_1/Loong_1.skel',
    atlas: '/live/dev/spine/Loong_1/Loong_1.atlas',
  },
  Serpent: {
    skel: '/live/dev/spine/Serpent_1/Serpent_1.skel',
    atlas: '/live/dev/spine/Serpent_1/Serpent_1.atlas',
  },
} as const satisfies Record<string, SpeciesAsset>;

export type SpeciesName = keyof typeof species;

export interface TeamAsset {
  species: SpeciesName;
  skin: string | null;
  skinIndex: number;
}

/**
 * Teams 1-8 mapping:
 * Teams 1-6 each map to one species in order.
 * Teams 7 and 8 reuse Classic and GemDragon respectively with skinIndex: 1 to differ.
 * skin: null means pick the first non-Max/non-Shiny skin at runtime.
 */
export const teams: Record<number, TeamAsset> = {
  1: { species: 'Classic', skin: null, skinIndex: 0 },
  2: { species: 'GemDragon', skin: null, skinIndex: 0 },
  3: { species: 'Wyvern', skin: null, skinIndex: 0 },
  4: { species: 'Cat', skin: null, skinIndex: 0 },
  5: { species: 'Loong', skin: null, skinIndex: 0 },
  6: { species: 'Serpent', skin: null, skinIndex: 0 },
  7: { species: 'Classic', skin: null, skinIndex: 1 },
  8: { species: 'GemDragon', skin: null, skinIndex: 1 },
};

/**
 * Backgrounds under /live/dev/bg/
 */
export const bg = {
  lobby: '/live/dev/bg/LoadScreen__Splash_Full.png',
  play: '/live/dev/bg/Character_rooms__default.png',
  podium: '/live/dev/bg/Character_rooms__temple_ext.png',
} as const;

/**
 * Music tracks (base name without extension)
 */
export const music = {
  lobby: '/live/dev/sfx/Dragons_Music_Mastered_Section_01',
  play: '/live/dev/sfx/Dragons_Music_Mastered_Section_02',
  podium: '/live/dev/sfx/Dragons_Music_Mastered_Section_03',
} as const;

/**
 * SFX cues (base name without extension)
 */
export const sfx = {
  join: '/live/dev/sfx/Egg_Appear',
  start: '/live/dev/sfx/Menu_Open',
  hurry: '/live/dev/sfx/Button_Hurry',
  answer: '/live/dev/sfx/Button_On',
  correct: '/live/dev/sfx/Button_Success',
  wrong: '/live/dev/sfx/Button_Error',
  reveal: '/live/dev/sfx/PopSparkles',
  points: '/live/dev/sfx/PointsReachCount',
  crack: '/live/dev/sfx/Egg_Crack',
  hatch: '/live/dev/sfx/Egg_Open',
  podium: '/live/dev/sfx/Receive_Reward',
  tap: '/live/dev/sfx/Butterfly_Tap',
} as const;

const sfxMap: Record<string, string | undefined> = sfx;
const musicMap: Record<string, string | undefined> = music;

/**
 * Resolves an audio path or key to a playable URL.
 * Checks for '.ogg' first, then '.wav'.
 */
export async function resolveAudioUrl(basePathOrKey: string | null | undefined): Promise<string | null> {
  if (!basePathOrKey || typeof basePathOrKey !== 'string') return null;

  let base = basePathOrKey;
  const sfxMatch = sfxMap[base];
  const musicMatch = musicMap[base];
  const sfxPrefixed = base.startsWith('sfx.') ? sfxMap[base.slice(4)] : undefined;
  const musicPrefixed = base.startsWith('music.') ? musicMap[base.slice(6)] : undefined;
  if (sfxMatch) {
    base = sfxMatch;
  } else if (musicMatch) {
    base = musicMatch;
  } else if (sfxPrefixed) {
    base = sfxPrefixed;
  } else if (musicPrefixed) {
    base = musicPrefixed;
  }

  // If input already has an audio extension
  if (/\.(ogg|wav|mp3|m4a|aac)$/i.test(base)) {
    return (await assetExists(base)) ? base : null;
  }

  // Try .ogg first, then .wav
  const oggUrl = `${base}.ogg`;
  if (await assetExists(oggUrl)) return oggUrl;

  const wavUrl = `${base}.wav`;
  if (await assetExists(wavUrl)) return wavUrl;

  return null;
}

export const resolveAudio = resolveAudioUrl;
export const resolveSoundUrl = resolveAudioUrl;

export const LIVE_ASSETS = {
  species,
  teams,
  bg,
  music,
  sfx,
};

export default LIVE_ASSETS;
