"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DragonBaseApi } from "@/lib/dragon/engine.mjs";
import {
  toHatcherySave,
  type DragonSceneInputItem,
  type DragonSourceMap,
} from "@/lib/dragon-scene";
import "./dragon-game.css";

interface DragonInteraction {
  kind: string;
  actorId?: string;
}

interface DragonViewUi {
  HatcheryFeature: ReturnType<
    typeof import("@/lib/dragon/hatchery-panel.mjs").createHatcheryFeature
  >;
}

export interface DragonSceneViewProps {
  dragons: readonly DragonSceneInputItem[];
}

function createMemoryStorage(initialEntries: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initialEntries));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

export function DragonSceneView({ dragons }: DragonSceneViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [api, setApi] = useState<DragonBaseApi | null>(null);
  const [ui, setUi] = useState<DragonViewUi | null>(null);
  const [memoryStorage, setMemoryStorage] = useState<ReturnType<
    typeof createMemoryStorage
  > | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [error, setError] = useState<string>("");
  const [interaction, setInteraction] = useState<DragonInteraction | null>(null);
  const [selectedOpen, setSelectedOpen] = useState(false);

  const onInteract = useCallback((event: DragonInteraction) => {
    if (event.kind === "dismiss-hatchery") {
      setSelectedOpen(false);
      return;
    }
    if (event.kind === "hatchery" && event.actorId) {
      setInteraction(event);
      setSelectedOpen(true);
    }
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new AbortController();
    let engine: DragonBaseApi | null = null;

    setApi(null);
    setError("");
    setSelectedOpen(false);
    setInteraction(null);

    (async () => {
      try {
        const [PIXI, { assetUrl }, { HATCHERY_KEY }] = await Promise.all([
          import("pixi.js"),
          import("@/lib/dragon/asset-base.mjs"),
          import("@/lib/dragon/hatchery.mjs"),
        ]);
        if (controller.signal.aborted) return;

        (globalThis as { PIXI?: unknown }).PIXI = PIXI;

        const mapRes = await fetch(assetUrl("data/source-map.json"), {
          signal: controller.signal,
        });
        if (!mapRes.ok) {
          throw new Error(`โหลดแผนที่ไม่สำเร็จ (HTTP ${mapRes.status})`);
        }
        const map = (await mapRes.json()) as DragonSourceMap;
        if (controller.signal.aborted) return;

        const save = toHatcherySave(dragons, map);
        const storage = createMemoryStorage({
          [HATCHERY_KEY]: JSON.stringify(save),
        });
        setMemoryStorage(storage);

        const [{ createBase }, { createHatcheryFeature }] = await Promise.all([
          import("@/lib/dragon/engine.mjs"),
          import("@/lib/dragon/hatchery-panel.mjs"),
        ]);
        if (controller.signal.aborted) return;

        setUi({
          HatcheryFeature: createHatcheryFeature(React),
        });

        const nextApi = await createBase(host, {
          signal: controller.signal,
          storage,
          viewOnly: true,
          fogEnabled: false,
          onProgress: (loaded, total) => setProgress([loaded, total]),
          onInteract,
        });
        engine = nextApi;

        if (controller.signal.aborted) {
          nextApi.destroy();
          return;
        }

        setApi(nextApi);
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "ไม่สามารถเปิดฐานมังกรได้"
          );
        }
      }
    })();

    return () => {
      controller.abort();
      engine?.destroy();
      setApi(null);
    };
  }, [dragons, onInteract]);

  const closeHatchery = useCallback(() => {
    setSelectedOpen(false);
  }, []);

  useEffect(() => {
    if (!selectedOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedOpen]);

  const HatcheryFeature = ui?.HatcheryFeature;

  return (
    <div className="dragon-game">
      <div className="world" ref={hostRef} />
      {(!api || error) && (
        <div className="boot" role="status">
          <strong>{error ? "เปิดฐานไม่สำเร็จ" : "กำลังเปิดป่ามังกร…"}</strong>
          <p>{error || `กำลังโหลดภาพ ${progress[0]} / ${progress[1]}`}</p>
        </div>
      )}
      {api && HatcheryFeature && memoryStorage && (
        <HatcheryFeature
          api={api}
          open={selectedOpen}
          interaction={interaction}
          storage={memoryStorage}
          viewOnly
          onClose={closeHatchery}
        />
      )}
    </div>
  );
}
