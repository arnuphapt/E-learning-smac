"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DragonBaseApi } from "@/lib/dragon/engine.mjs";
import { DRAGON_GROWTH_THRESHOLDS } from "@/lib/dragon-growth";
import {
  toHatcherySave,
  toSummoningHatcherySave,
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
  allowHatch?: boolean;
  summonFirstEgg?: boolean;
  onHatched?: () => void | Promise<void>;
  onLoadError?: (message: string) => void;
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

export function DragonSceneView({
  dragons,
  allowHatch = false,
  summonFirstEgg = false,
  onHatched,
  onLoadError,
}: DragonSceneViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dragonsRef = useRef(dragons);
  const onHatchedRef = useRef(onHatched);
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => {
    dragonsRef.current = dragons;
    onHatchedRef.current = onHatched;
    onLoadErrorRef.current = onLoadError;
  }, [dragons, onHatched, onLoadError]);
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

        const save =
          summonFirstEgg && dragons.length > 0
            ? toSummoningHatcherySave(dragons[0], map)
            : toHatcherySave(dragons, map);
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
          allowHatch,
          fogEnabled: false,
          onProgress: (loaded, total) => setProgress([loaded, total]),
          onInteract,
        });
        engine = nextApi;

        if (controller.signal.aborted) {
          nextApi.destroy();
          return;
        }

        if (summonFirstEgg) {
          nextApi.focusAt("IncubatorEggMarker", 14);
        }

        (window as { __dragonSceneApi?: DragonBaseApi }).__dragonSceneApi =
          nextApi;
        setApi(nextApi);
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          const msg =
            err instanceof Error ? err.message : "ไม่สามารถเปิดฐานมังกรได้";
          setError(msg);
          onLoadErrorRef.current?.(msg);
        }
      }
    })();

    return () => {
      controller.abort();
      if (
        (window as { __dragonSceneApi?: DragonBaseApi }).__dragonSceneApi ===
        engine
      ) {
        delete (window as { __dragonSceneApi?: DragonBaseApi }).__dragonSceneApi;
      }
      engine?.destroy();
      setApi(null);
    };
  }, [dragons, allowHatch, summonFirstEgg, onInteract]);

  const handleHatch = useCallback(async (dragonId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/dragon/hatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dragonId }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(body?.error || "ไม่สามารถฟักไข่ได้");
        return false;
      }
      return true;
    } catch {
      toast.error("ไม่สามารถฟักไข่ได้");
      return false;
    }
  }, []);

  const handleHatchNotReady = useCallback((dragonId: string) => {
    const dragon = dragonsRef.current.find((d) => d.id === dragonId);
    const needed = Math.max(
      0,
      DRAGON_GROWTH_THRESHOLDS.hatch - (dragon?.points ?? 0),
    );
    toast.info(`ต้องการอีก ${needed.toLocaleString("th-TH")} แต้มจึงจะฟักได้`);
  }, []);

  const handleHatchComplete = useCallback(async () => {
    async function runRefresh(): Promise<void> {
      try {
        await onHatchedRef.current?.();
      } catch {
        toast.error("ฟักไข่สำเร็จแล้ว แต่โหลดข้อมูลใหม่ไม่สำเร็จ", {
          action: {
            label: "ลองใหม่",
            onClick: () => void runRefresh(),
          },
        });
      }
    }
    await runRefresh();
  }, []);

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
          allowHatch={allowHatch}
          allowSummonTick={summonFirstEgg}
          onHatch={handleHatch}
          onHatchNotReady={handleHatchNotReady}
          onHatchComplete={handleHatchComplete}
          onClose={closeHatchery}
        />
      )}
    </div>
  );
}
