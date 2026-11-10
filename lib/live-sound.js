/**
 * LIVE QUIZ SOUND ENGINE
 *
 * Client-only native Web Audio module without external libraries.
 * Handles sound effects, background music looping, crossfading, ducking,
 * and role-based mute persistence in localStorage.
 */

import { LIVE_ASSETS, resolveAudioUrl } from './live-assets.js';

const CROSSFADE_SEC = 0.5;

// Web Audio graph nodes
let audioCtx = null;
let masterGain = null;
let musicBusGain = null;
let musicDuckGain = null;
let sfxBusGain = null;

// State
let currentRole = 'player';
let isMutedState = true;
let isDuckedState = false;

// Audio buffer cache (URL -> AudioBuffer) and in-flight fetch/decode promises
const bufferCache = new Map();
const bufferLoading = new Map();

// Track keys/URLs that have already logged a warning to prevent console spam
const warnedKeys = new Set();

// Music playback state
let currentMusic = null; // { key, url, source, gainNode }
let nextMusicTarget = null; // key of the track currently transitioning to

function warnOnce(key, message) {
  const k = String(key || 'unknown');
  if (!warnedKeys.has(k)) {
    warnedKeys.add(k);
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[live-sound] ${message}`);
    }
  }
}

/**
 * Applies current mute state to master gain node if audio context is active.
 */
function applyMute() {
  if (masterGain && audioCtx) {
    try {
      masterGain.gain.setValueAtTime(isMutedState ? 0 : 1, audioCtx.currentTime);
    } catch {
      // silent
    }
  }
}

/**
 * Initializes sound engine settings for a specific role ('host' or 'player').
 * Reads persisted mute state from localStorage ('live-sound-muted:<role>').
 * Defaults: host is unmuted (false), player is muted (true).
 *
 * @param {{ role?: 'host'|'player' }} [options]
 * @returns {{ role: string, muted: boolean }}
 */
export function init({ role = 'player' } = {}) {
  currentRole = role;
  const storageKey = `live-sound-muted:${role}`;
  let saved = null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      saved = window.localStorage.getItem(storageKey);
    }
  } catch {
    // silent
  }

  if (saved !== null) {
    isMutedState = saved === 'true';
  } else {
    // Default: host unmuted, player muted
    isMutedState = role !== 'host';
  }

  applyMute();
  return { role: currentRole, muted: isMutedState };
}

/**
 * Returns current muted state.
 * @returns {boolean}
 */
export function isMuted() {
  return isMutedState;
}

/**
 * Sets muted state and persists to localStorage.
 *
 * @param {boolean} val
 * @returns {boolean}
 */
export function setMuted(val) {
  isMutedState = Boolean(val);
  const storageKey = `live-sound-muted:${currentRole}`;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, String(isMutedState));
    }
  } catch {
    // silent
  }

  applyMute();
  return isMutedState;
}

/**
 * Creates or resumes AudioContext upon user gesture.
 * Call from a user click / tap event.
 *
 * @returns {Promise<AudioContext|null>}
 */
export async function unlock() {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      audioCtx = new AudioCtx();

      // Master gain node controls overall mute
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMutedState ? 0 : 1, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // SFX bus
      sfxBusGain = audioCtx.createGain();
      sfxBusGain.gain.setValueAtTime(1, audioCtx.currentTime);
      sfxBusGain.connect(masterGain);

      // Music bus: [trackGain] -> [duckGain] -> [musicBusGain] -> [masterGain]
      musicDuckGain = audioCtx.createGain();
      musicDuckGain.gain.setValueAtTime(isDuckedState ? 0.25 : 1.0, audioCtx.currentTime);

      musicBusGain = audioCtx.createGain();
      musicBusGain.gain.setValueAtTime(1, audioCtx.currentTime);

      musicDuckGain.connect(musicBusGain);
      musicBusGain.connect(masterGain);
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    return audioCtx;
  } catch (err) {
    warnOnce('unlock', `Failed to initialize AudioContext: ${err?.message || err}`);
    return null;
  }
}

async function ensureContext() {
  if (!audioCtx) {
    return await unlock();
  }
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      // autoplay policy may block until user interaction
    }
  }
  return audioCtx;
}

/**
 * Ducks (lowers) music volume during announcements/reveals.
 *
 * @param {boolean} on
 */
export function duck(on) {
  isDuckedState = Boolean(on);
  if (musicDuckGain && audioCtx) {
    try {
      const targetGain = isDuckedState ? 0.25 : 1.0;
      musicDuckGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.08);
    } catch {
      // silent
    }
  }
}

/**
 * Loads and decodes an audio buffer. Caches decoded buffers.
 * Silent on failure, warns at most once per file/key.
 *
 * @param {string} url
 * @param {string} [keyForWarning]
 * @returns {Promise<AudioBuffer|null>}
 */
async function loadAudioBuffer(url, keyForWarning) {
  if (!url) return null;
  if (bufferCache.has(url)) {
    return bufferCache.get(url);
  }
  if (bufferLoading.has(url)) {
    return await bufferLoading.get(url);
  }

  const loadPromise = (async () => {
    try {
      const ctx = await ensureContext();
      if (!ctx) return null;

      const res = await fetch(url);
      if (!res.ok) {
        warnOnce(keyForWarning || url, `Could not load audio file (${res.status}): ${url}`);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const decodedBuffer = await new Promise((resolve, reject) => {
        ctx.decodeAudioData(arrayBuffer, resolve, reject);
      });

      bufferCache.set(url, decodedBuffer);
      return decodedBuffer;
    } catch (err) {
      warnOnce(keyForWarning || url, `Decode failed for ${url}: ${err?.message || err}`);
      return null;
    } finally {
      bufferLoading.delete(url);
    }
  })();

  bufferLoading.set(url, loadPromise);
  return await loadPromise;
}

/**
 * Plays a sound effect cue by key.
 * Decodes buffer once, caches it, and supports concurrent overlapping playback.
 * Silent if missing or on error.
 *
 * @param {string} key - SFX key (e.g. 'join', 'answer', 'correct') or path
 * @returns {Promise<AudioBufferSourceNode|null>}
 */
export async function play(key) {
  if (typeof window === 'undefined' || !key) return null;

  try {
    const ctx = await ensureContext();
    if (!ctx) return null;

    const url = await resolveAudioUrl(key);
    if (!url) {
      warnOnce(key, `No asset mapped or found for sfx: ${key}`);
      return null;
    }

    const buffer = await loadAudioBuffer(url, key);
    if (!buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(sfxBusGain || masterGain || ctx.destination);
    source.start(0);

    return source;
  } catch (err) {
    warnOnce(key, `Playback error for ${key}: ${err?.message || err}`);
    return null;
  }
}

/**
 * Smoothly fades out and stops a music state instance over CROSSFADE_SEC.
 */
function fadeOutAndStop(musicState) {
  if (!musicState || !musicState.source || !audioCtx) return;
  try {
    const { source, gainNode } = musicState;
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + CROSSFADE_SEC);
    source.stop(now + CROSSFADE_SEC);
    setTimeout(() => {
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch {
        // silent
      }
    }, (CROSSFADE_SEC + 0.1) * 1000);
  } catch {
    // silent
  }
}

/**
 * Plays background music in a loop with ~0.5s crossfade between tracks.
 * Passing null/empty/falsy stops the current music.
 *
 * @param {string|null} key - Music track key ('lobby', 'play', 'podium') or null to stop
 * @returns {Promise<object|null>} Current music state
 */
export async function music(key) {
  if (typeof window === 'undefined') return null;

  nextMusicTarget = key;

  // Stop current music
  if (!key) {
    if (currentMusic) {
      fadeOutAndStop(currentMusic);
      currentMusic = null;
    }
    return null;
  }

  // Already playing this exact track
  if (currentMusic && currentMusic.key === key && currentMusic.source) {
    return currentMusic;
  }

  try {
    const ctx = await ensureContext();
    if (!ctx) return null;

    const url = await resolveAudioUrl(key);
    if (!url) {
      warnOnce(key, `No asset mapped or found for music: ${key}`);
      if (currentMusic) {
        fadeOutAndStop(currentMusic);
        currentMusic = null;
      }
      return null;
    }

    const buffer = await loadAudioBuffer(url, key);
    // If target changed while awaiting buffer load, abort this track
    if (nextMusicTarget !== key) {
      return null;
    }

    if (!buffer) {
      if (currentMusic) {
        fadeOutAndStop(currentMusic);
        currentMusic = null;
      }
      return null;
    }

    const newSource = ctx.createBufferSource();
    newSource.buffer = buffer;
    newSource.loop = true;

    const trackGain = ctx.createGain();
    const now = ctx.currentTime;

    // Crossfade in: 0 -> 1 over CROSSFADE_SEC
    trackGain.gain.setValueAtTime(0, now);
    trackGain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SEC);

    newSource.connect(trackGain);
    trackGain.connect(musicDuckGain || musicBusGain || masterGain || ctx.destination);
    newSource.start(now);

    // Crossfade out previous track
    if (currentMusic) {
      fadeOutAndStop(currentMusic);
    }

    currentMusic = {
      key,
      url,
      source: newSource,
      gainNode: trackGain,
    };

    return currentMusic;
  } catch (err) {
    warnOnce(key, `Error playing music ${key}: ${err?.message || err}`);
    return null;
  }
}

/**
 * Stops currently playing background music.
 */
export function stopMusic() {
  return music(null);
}

export default {
  unlock,
  play,
  music,
  stopMusic,
  duck,
  setMuted,
  isMuted,
  init,
};
