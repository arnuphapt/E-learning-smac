import { assetUrl } from "./asset-base.mjs";
import { createAdultSourceLoader, resolveAdultSkin } from "./adult-animation.mjs";
import { createBabySourceLoader } from "./baby-animation.mjs";
import { createSpineActor } from "./spine-actor.mjs";

let catalogPromise = null;

function loadCatalog(signal) {
  if (!catalogPromise) {
    catalogPromise = fetch(assetUrl("generated/hatching/catalog.json"), { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Catalog HTTP ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

export const PODIUM_ENTRY_TIMING = {
  staggerSeconds: 0.65,
  flySeconds: 0.95,
  hoverSeconds: 0.45,
};

const PLACE_DELAY_INDEX = { 3: 0, 2: 1, 1: 2 };

/**
 * Pure schedule evaluator for adult podium entry:
 * 3rd -> 2nd -> 1st staggered ~0.65s apart, total <= 3s.
 */
export function evaluatePodiumEntry({
  place = 1,
  elapsedSeconds,
  restX,
  restY,
  slotWidth,
  slotHeight,
  reducedMotion = false,
}) {
  if (reducedMotion) {
    return {
      visible: true,
      phase: "idle",
      clipName: "Ground/Idle",
      x: restX,
      y: restY,
    };
  }

  const order = PLACE_DELAY_INDEX[place] ?? 2;
  const delay = order * PODIUM_ENTRY_TIMING.staggerSeconds;
  const localT = elapsedSeconds - delay;

  if (localT < 0) {
    return {
      visible: false,
      phase: "waiting",
      clipName: "Fly",
      x: restX,
      y: restY,
    };
  }

  const { flySeconds, hoverSeconds } = PODIUM_ENTRY_TIMING;
  const hoverLift = Math.max(12, Math.round(slotHeight * 0.14));
  const hoverY = restY - hoverLift;

  if (localT < flySeconds) {
    const t = localT / flySeconds;
    const p = t * t * (3 - 2 * t);
    const side = place === 3 ? 1 : -1;
    const startX = restX + side * Math.max(48, slotWidth * 0.45);
    const startY = restY - Math.max(150, slotHeight * 1.25);
    const arc = Math.sin(Math.PI * t) * Math.max(24, slotHeight * 0.25);
    return {
      visible: true,
      phase: "fly",
      clipName: "Fly",
      x: startX + (restX - startX) * p,
      y: startY + (hoverY - startY) * p - arc,
    };
  }

  if (localT < flySeconds + hoverSeconds) {
    const t = (localT - flySeconds) / hoverSeconds;
    const p = t * t * (3 - 2 * t);
    return {
      visible: true,
      phase: "hover",
      clipName: "Hover",
      x: restX,
      y: hoverY + (restY - hoverY) * p,
    };
  }

  return {
    visible: true,
    phase: "idle",
    clipName: "Ground/Idle",
    x: restX,
    y: restY,
  };
}

const entryGroups = new Map();

function createTextureLoader(PIXI, ownedTextures) {
  const textureCache = new Map();
  return (name) => {
    if (textureCache.has(name)) return textureCache.get(name);
    const url = assetUrl(`assets/Texture2D/${encodeURIComponent(name)}`);
    const promise = new Promise((resolve, reject) => {
      const base = PIXI.BaseTexture.from(url, {
        alphaMode: PIXI.ALPHA_MODES.UNPACK,
        scaleMode: PIXI.SCALE_MODES.LINEAR,
        mipmap: 0,
      });
      const tex = new PIXI.Texture(base);
      ownedTextures.push(tex);
      if (base.valid) {
        resolve(tex);
      } else {
        base.once("loaded", () => resolve(tex));
        base.once("error", (err) => reject(err));
      }
    });
    textureCache.set(name, promise);
    return promise;
  };
}

/** Mount a lightweight view-only PixiJS idle preview of a single dragon (egg, baby, or adult). */
export async function mountPodiumDragon(host, { speciesId, stage, place = 1, isPartner = true, entryGroup, signal }) {
  let group = null;
  let markedReady = false;
  if (stage === "adult" && entryGroup?.id) {
    group = entryGroups.get(entryGroup.id);
    if (!group) {
      group = { expected: Math.max(1, entryGroup.expectedAdults || 1), ready: 0, startedAt: null, active: 0 };
      entryGroups.set(entryGroup.id, group);
    }
    group.active++;
  }
  const releaseGroup = () => {
    if (!group) return;
    if (!markedReady) {
      group.expected = Math.max(0, group.expected - 1);
      if (group.ready >= group.expected && group.startedAt === null && group.ready > 0) {
        group.startedAt = performance.now();
      }
    }
    group.active--;
    if (group.active <= 0) entryGroups.delete(entryGroup.id);
  };

  const ownedTextures = [];
  let actorContainer = null;
  let stepFrame = null;
  let updateEntry = null;
  const reducedMotion =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  const hasEntryFlight = stage === "adult" && !reducedMotion;

  const cleanupAborted = () => {
    releaseGroup();
    for (const t of ownedTextures) t.destroy(false);
    return () => {};
  };

  try {
    const PIXI = await import("pixi.js");
    if (signal?.aborted) return cleanupAborted();

    const catalog = await loadCatalog(signal);
    if (signal?.aborted) return cleanupAborted();

    const species = catalog.species.find((s) => s.id === speciesId);
    if (!species) return cleanupAborted();

    const loadTexture = createTextureLoader(PIXI, ownedTextures);

    if (stage === "egg") {
      const res = await fetch(assetUrl(species.url), { signal });
      if (!res.ok) throw new Error(`Egg data HTTP ${res.status}`);
      const data = await res.json();
      if (signal?.aborted) return cleanupAborted();

      const uniquePages = [...new Set(data.shapes.map((s) => data.pages[s.page]))];
      const resolved = new Map(
        await Promise.all(uniquePages.map(async (p) => [p, await loadTexture(p)]))
      );
      if (signal?.aborted) return cleanupAborted();

      const container = new PIXI.Container();
      const parts = data.shapes.map((s) => {
        const mesh = new PIXI.SimpleMesh(
          resolved.get(data.pages[s.page]),
          new Float32Array(s.uv.length),
          Float32Array.from(s.uv),
          Uint16Array.from(s.tri)
        );
        mesh.autoUpdate = false;
        mesh.eventMode = "none";
        mesh.visible = false;
        container.addChild(mesh);
        return mesh;
      });

      const clip = data.clips.find((c) => c.name === "Stage0/Idle") ?? data.clips[0];
      let lastFrame = -1;
      stepFrame = (elapsedSeconds) => {
        if (!clip || !clip.frames.length) return;
        const frame = Math.floor(
          ((elapsedSeconds % clip.duration) / clip.duration) * clip.frames.length
        );
        if (frame === lastFrame) return;
        lastFrame = frame;
        for (const m of parts) m.visible = false;
        for (const [id, positions, alpha] of clip.frames[frame]) {
          const m = parts[id];
          if (!m) continue;
          m.visible = true;
          m.alpha = alpha;
          for (let i = 0; i < positions.length; i += 2) {
            m.vertices[i] = positions[i] * 0.01;
            m.vertices[i + 1] = -positions[i + 1] * 0.01;
          }
          m.geometry.getBuffer("aVertexPosition").update();
          container.addChild(m);
        }
      };
      stepFrame(0);
      actorContainer = container;
    } else if (stage === "baby") {
      const babySource = createBabySourceLoader(loadTexture);
      const loaded = await babySource(species, catalog);
      if (signal?.aborted) return cleanupAborted();

      const rig = createSpineActor(PIXI, {
        skeletonData: loaded.source.skeletonData,
        skin: species.id,
        textures: loaded.textures,
        pages: loaded.config.pages,
        mixSeconds: catalog.feeding.mixSeconds,
      });
      const clipName = "Stage1/Idle";
      const duration = loaded.config.animations[clipName] ?? 3.33;
      stepFrame = (elapsedSeconds) => {
        rig.sample(
          {
            name: clipName,
            elapsed: elapsedSeconds % duration,
            loop: true,
            key: `podium-baby:${species.id}`,
          },
          elapsedSeconds * 1000,
          false
        );
      };
      stepFrame(0);
      actorContainer = rig.mesh;
    } else {
      const adultSource = createAdultSourceLoader(loadTexture);
      const loaded = await adultSource(species, catalog);
      if (signal?.aborted) return cleanupAborted();

      const rig = createSpineActor(PIXI, {
        skeletonData: loaded.source.skeletonData,
        skin: resolveAdultSkin(loaded.source.skeletonData, species.id, Boolean(isPartner)),
        textures: loaded.textures,
        pages: loaded.config.pages,
        mixSeconds: loaded.config.mixSeconds ?? 0.25,
      });
      const idleDuration = loaded.config.animations["Ground/Idle"] ?? 2;
      const sampleIdle = (elapsedSeconds) => {
        rig.sample(
          {
            name: "Ground/Idle",
            elapsed: elapsedSeconds % idleDuration,
            loop: true,
            key: `podium-adult:${species.id}:idle`,
          },
          elapsedSeconds * 1000,
          false
        );
      };
      // Measure resting Ground/Idle bounds first so final size/position match the resting layout.
      sampleIdle(0);

      let activePhase = null;
      updateEntry = (elapsedSeconds, rest) => {
        const state = evaluatePodiumEntry({
          place,
          elapsedSeconds,
          restX: rest.x,
          restY: rest.y,
          slotWidth: rest.slotWidth,
          slotHeight: rest.slotHeight,
          reducedMotion,
        });
        rig.mesh.visible = state.visible;
        rig.mesh.x = state.x;
        rig.mesh.y = state.y;
        activePhase = state;
        return state;
      };

      stepFrame = (elapsedSeconds) => {
        const phase = activePhase?.phase ?? (hasEntryFlight ? "waiting" : "idle");
        const clipName = activePhase?.clipName ?? "Ground/Idle";
        if (phase === "waiting") return;
        if (phase === "idle" && !hasEntryFlight) {
          sampleIdle(elapsedSeconds);
          return;
        }
        rig.sample(
          {
            name: clipName,
            loop: true,
            realTime: true,
            key: `podium-adult:${species.id}:${clipName}`,
          },
          elapsedSeconds * 1000,
          false
        );
      };
      actorContainer = rig.mesh;
    }

    if (!actorContainer || signal?.aborted) {
      return cleanupAborted();
    }

    let canvasHost = host;
    if (hasEntryFlight) {
      canvasHost = document.createElement("div");
      Object.assign(canvasHost.style, {
        position: "absolute",
        bottom: "0",
        left: "50%",
        transform: "translateX(-50%)",
        width: "220%",
        height: "240%",
        pointerEvents: "none",
      });
      host.append(canvasHost);
    }

    const app = new PIXI.Application({
      resizeTo: canvasHost,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: "high-performance",
    });
    canvasHost.append(app.view);
    app.stage.addChild(actorContainer);

    // Measure tight visible bounds across active mesh parts so wide-winged rigs fill slot height cleanly.
    const measureVisibleBounds = () => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const visit = (node) => {
        if (!node.visible || node.alpha <= 0) return;
        if (node.geometry && typeof node.getLocalBounds === "function") {
          const b = node.getLocalBounds();
          if (b.width > 0 && b.height > 0) {
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
          }
        }
        if (node.children) {
          for (const child of node.children) visit(child);
        }
      };
      visit(actorContainer);

      if (Number.isFinite(minX) && maxX > minX && maxY > minY) {
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
      return actorContainer.getLocalBounds();
    };

    const bounds = measureVisibleBounds();
    const heightFill = stage === "egg" ? 0.72 : stage === "baby" ? 0.86 : 0.96;
    const rest = { x: 0, y: 0, slotWidth: 0, slotHeight: 0 };
    const localStartedAt = performance.now();
    const getElapsedSeconds = () => {
      if (!group) return (performance.now() - localStartedAt) / 1000;
      if (group.startedAt === null) return -1;
      return (performance.now() - group.startedAt) / 1000;
    };
    const fit = () => {
      const w = host.clientWidth || app.screen.width;
      const h = host.clientHeight || app.screen.height;
      const cw = canvasHost.clientWidth || app.screen.width;
      const ch = canvasHost.clientHeight || app.screen.height;
      if (!w || !h || !cw || !ch || bounds.width <= 0 || bounds.height <= 0) return;
      const scale = Math.min((w * 0.94) / bounds.width, (h * heightFill) / bounds.height);
      actorContainer.scale.set(scale);
      rest.x = cw / 2 - (bounds.x + bounds.width / 2) * scale;
      rest.y = ch - (bounds.y + bounds.height) * scale;
      rest.slotWidth = w;
      rest.slotHeight = h;
      if (updateEntry) {
        updateEntry(getElapsedSeconds(), rest);
      } else {
        actorContainer.x = rest.x;
        actorContainer.y = rest.y;
      }
    };
    if (group) {
      markedReady = true;
      group.ready++;
      if (group.ready >= group.expected && group.startedAt === null) {
        group.startedAt = performance.now();
      }
    }
    fit();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(host);

    const onTick = () => {
      const elapsedSeconds = getElapsedSeconds();
      updateEntry?.(elapsedSeconds, rest);
      stepFrame?.(elapsedSeconds < 0 ? 0 : elapsedSeconds);
    };
    app.ticker.add(onTick);

    return () => {
      releaseGroup();
      ro?.disconnect();
      app.ticker.remove(onTick);
      app.destroy(true, { children: true, texture: false, baseTexture: false });
      if (canvasHost !== host) canvasHost.remove();
      for (const t of ownedTextures) t.destroy(false);
    };
  } catch (err) {
    cleanupAborted();
    throw err;
  }
}

/**
 * Mount a lightweight transparent overlay controller for the student's adult partner
 * to fly in, perch on a choice tile's top edge (`Branch/Idle`), and take off (`Fly`).
 */
export async function mountQuizPartnerDragon(host, { speciesId, isPartner = true, signal }) {
  const PIXI = await import("pixi.js");
  if (signal?.aborted) return null;

  const catalog = await loadCatalog(signal);
  if (signal?.aborted) return null;

  const species = catalog.species.find((s) => s.id === speciesId);
  if (!species) return null;

  const ownedTextures = [];
  const loadTexture = createTextureLoader(PIXI, ownedTextures);

  const adultSource = createAdultSourceLoader(loadTexture);
  const loaded = await adultSource(species, catalog);
  if (signal?.aborted) {
    for (const t of ownedTextures) t.destroy(false);
    return null;
  }

  const rig = createSpineActor(PIXI, {
    skeletonData: loaded.source.skeletonData,
    skin: resolveAdultSkin(loaded.source.skeletonData, species.id, Boolean(isPartner)),
    textures: loaded.textures,
    pages: loaded.config.pages,
    mixSeconds: loaded.config.mixSeconds ?? 0.25,
  });

  // Measure Branch/Idle bounds so feet rest cleanly on the choice tile's top edge.
  rig.sample({ name: "Branch/Idle", elapsed: 0, loop: true, key: "quiz-measure" }, 0, false);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (node) => {
    if (!node.visible || node.alpha <= 0) return;
    if (node.geometry && typeof node.getLocalBounds === "function") {
      const b = node.getLocalBounds();
      if (b.width > 0 && b.height > 0) {
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
    }
    if (node.children) for (const c of node.children) visit(c);
  };
  visit(rig.mesh);
  const bounds =
    Number.isFinite(minX) && maxX > minX && maxY > minY
      ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
      : rig.mesh.getLocalBounds();

  const app = new PIXI.Application({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    powerPreference: "high-performance",
  });
  app.view.style.pointerEvents = "none";
  host.append(app.view);
  app.stage.addChild(rig.mesh);

  const reducedMotion =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

  const flySeconds = 0.7;
  const hoverSeconds = 0.35;
  const takeoffSeconds = 0.55;
  const fadeSeconds = 0.25;

  let mode = "hidden"; // 'hidden' | 'enter' | 'perch' | 'takeoff'
  let modeStartMs = performance.now();
  let restX = 0;
  let restY = 0;
  let dragonHeight = 52;
  let takeoffFromX = 0;
  let takeoffFromY = 0;

  const computeRest = (rect) => {
    const targetH = Math.min(64, Math.max(44, rect.height * 0.72));
    const scale = bounds.height > 0 ? targetH / bounds.height : 0.25;
    rig.mesh.scale.set(scale);
    const dw = bounds.width * scale;
    dragonHeight = bounds.height * scale;
    const hostW = host.clientWidth || app.screen.width || rect.left + rect.width;
    const desiredCenter = rect.left + rect.width * 0.78;
    const clampedCenter = Math.min(hostW - dw / 2 - 4, Math.max(dw / 2 + 4, desiredCenter));
    restX = clampedCenter - (bounds.x + bounds.width / 2) * scale;
    restY = rect.top + 4 - (bounds.y + bounds.height) * scale;
  };

  const onTick = () => {
    const nowMs = performance.now();
    const localT = (nowMs - modeStartMs) / 1000;

    if (mode === "hidden") {
      rig.mesh.visible = false;
      return;
    }

    if (mode === "enter") {
      if (reducedMotion) {
        mode = "perch";
        rig.mesh.visible = true;
        rig.mesh.alpha = 1;
        rig.mesh.x = restX;
        rig.mesh.y = restY;
      } else if (localT < flySeconds) {
        const t = localT / flySeconds;
        const p = t * t * (3 - 2 * t);
        const startX = restX - 32;
        const startY = -dragonHeight - 24;
        const hoverY = restY - 14;
        const arc = Math.sin(Math.PI * t) * 18;
        rig.mesh.visible = true;
        rig.mesh.alpha = 1;
        rig.mesh.x = startX + (restX - startX) * p;
        rig.mesh.y = startY + (hoverY - startY) * p - arc;
        rig.sample({ name: "Fly", loop: true, realTime: true, key: "quiz:Fly" }, nowMs, false);
        return;
      } else if (localT < flySeconds + hoverSeconds) {
        const t = (localT - flySeconds) / hoverSeconds;
        const p = t * t * (3 - 2 * t);
        const hoverY = restY - 14;
        rig.mesh.visible = true;
        rig.mesh.alpha = 1;
        rig.mesh.x = restX;
        rig.mesh.y = hoverY + (restY - hoverY) * p;
        rig.sample({ name: "Hover", loop: true, realTime: true, key: "quiz:Hover" }, nowMs, false);
        return;
      } else {
        mode = "perch";
        rig.mesh.visible = true;
        rig.mesh.alpha = 1;
        rig.mesh.x = restX;
        rig.mesh.y = restY;
      }
    }

    if (mode === "perch") {
      rig.mesh.visible = true;
      rig.mesh.alpha = 1;
      rig.mesh.x = restX;
      rig.mesh.y = restY;
      rig.sample(
        { name: "Branch/Idle", loop: true, realTime: true, key: "quiz:Branch/Idle" },
        nowMs,
        false
      );
      return;
    }

    if (mode === "takeoff") {
      if (reducedMotion) {
        const alpha = Math.max(0, 1 - localT / fadeSeconds);
        rig.mesh.alpha = alpha;
        if (alpha <= 0) {
          mode = "hidden";
          rig.mesh.visible = false;
          return;
        }
        rig.sample(
          { name: "Branch/Idle", loop: true, realTime: true, key: "quiz:Branch/Idle" },
          nowMs,
          false
        );
        return;
      }

      if (localT >= takeoffSeconds) {
        mode = "hidden";
        rig.mesh.visible = false;
        return;
      }
      const t = localT / takeoffSeconds;
      const p = t * t;
      rig.mesh.visible = true;
      rig.mesh.alpha = 1;
      rig.mesh.x = takeoffFromX + 24 * p;
      rig.mesh.y = takeoffFromY + (-dragonHeight - 40 - takeoffFromY) * p;
      rig.sample({ name: "Fly", loop: true, realTime: true, key: "quiz:Fly" }, nowMs, false);
    }
  };

  app.ticker.add(onTick);

  return {
    flyTo(rect) {
      if (!rect) return;
      computeRest(rect);
      modeStartMs = performance.now();
      mode = reducedMotion ? "perch" : "enter";
      onTick();
    },
    reposition(rect) {
      if (!rect || mode === "hidden" || mode === "takeoff") return;
      computeRest(rect);
      if (mode === "perch") {
        rig.mesh.x = restX;
        rig.mesh.y = restY;
      }
    },
    takeOff() {
      if (mode === "hidden" || mode === "takeoff") return;
      takeoffFromX = rig.mesh.x || restX;
      takeoffFromY = rig.mesh.y || restY;
      modeStartMs = performance.now();
      mode = "takeoff";
    },
    destroy() {
      app.ticker.remove(onTick);
      app.destroy(true, { children: true, texture: false, baseTexture: false });
      for (const t of ownedTextures) t.destroy(false);
    },
  };
}
