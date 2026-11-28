"use client";

import { useEffect, useRef } from "react";
import type { DragonStage } from "@/lib/dragon-growth";
import type { PodiumEntryGroup } from "@/lib/dragon/podium-renderer.mjs";
import { cn } from "@/lib/utils";

export interface PodiumDragonProps {
  speciesId: string;
  stage: DragonStage;
  place: 1 | 2 | 3;
  isPartner?: boolean;
  entryGroup?: PodiumEntryGroup;
  className?: string;
}

const PLACE_SIZE: Record<1 | 2 | 3, string> = {
  1: "h-[clamp(100px,17vh,176px)] w-[min(100%,clamp(160px,24vw,300px))]",
  2: "h-[clamp(72px,11.5vh,124px)] w-[min(100%,clamp(108px,16vw,184px))]",
  3: "h-[clamp(56px,9vh,96px)] w-[min(100%,clamp(88px,13vw,148px))]",
};

export function PodiumDragon({
  speciesId,
  stage,
  place,
  isPartner = true,
  entryGroup,
  className,
}: PodiumDragonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const entryGroupId = entryGroup?.id;
  const entryExpectedAdults = entryGroup?.expectedAdults;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const controller = new AbortController();
    let dispose: (() => void) | undefined;

    (async () => {
      try {
        const { mountPodiumDragon } = await import("@/lib/dragon/podium-renderer.mjs");
        if (controller.signal.aborted) return;
        dispose = await mountPodiumDragon(host, {
          speciesId,
          stage,
          place,
          isPartner,
          entryGroup:
            entryGroupId && entryExpectedAdults
              ? { id: entryGroupId, expectedAdults: entryExpectedAdults }
              : undefined,
          signal: controller.signal,
        });
      } catch {
        // Keep the podium clean if a texture fails to load.
      }
    })();

    return () => {
      controller.abort();
      dispose?.();
    };
  }, [speciesId, stage, place, isPartner, entryGroupId, entryExpectedAdults]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn("relative pointer-events-none shrink-0", PLACE_SIZE[place], className)}
    />
  );
}
