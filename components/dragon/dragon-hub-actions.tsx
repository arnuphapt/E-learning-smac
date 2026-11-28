"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/dragon/asset-base.mjs";
import {
  formatDragonGrowthThai,
  type DragonGrowthState,
} from "@/lib/dragon-growth";

export interface DragonHubItem {
  id: string;
  species_id: string;
  points: number;
  is_partner: boolean;
  created_at: string;
  hatched_at?: string | null;
  growth: DragonGrowthState;
}

interface DragonHubActionsProps {
  dragons: readonly DragonHubItem[];
  growingDragonId: string | null;
}

interface CatalogResponse {
  species?: Array<{ id: string; name?: string }>;
}

export function DragonHubActions({
  dragons,
  growingDragonId,
}: DragonHubActionsProps) {
  const [speciesNames, setSpeciesNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch(assetUrl("generated/hatching/catalog.json"), {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<CatalogResponse>) : null))
      .then((catalog) => {
        if (!catalog?.species || controller.signal.aborted) return;
        const map: Record<string, string> = {};
        for (const sp of catalog.species) {
          if (sp.id && sp.name) map[sp.id] = sp.name;
        }
        setSpeciesNames(map);
      })
      .catch(() => {
        // Fallback to species_id label when catalog is unavailable.
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="db-panel flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold leading-6 text-[var(--text-strong)]">
          มังกรของฉัน ({dragons.length} ตัว)
        </h2>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {dragons.map((dragon) => {
          const name =
            speciesNames[dragon.species_id] || `สายพันธุ์ ${dragon.species_id}`;
          const isGrowing = dragon.id === growingDragonId;

          return (
            <div
              key={dragon.id}
              className="db-row flex-wrap justify-between sm:flex-nowrap"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="db-row-title truncate">{name}</span>
                  {dragon.is_partner && (
                    <Badge className="rounded-[var(--radius-sm)] border border-[var(--frame-soft)] bg-[var(--surface-well)] text-xs font-semibold text-[var(--text-cream)]">
                      คู่ใจ
                    </Badge>
                  )}
                  {isGrowing && (
                    <Badge className="rounded-[var(--radius-sm)] border border-[var(--frame-soft)] bg-[var(--surface-1)] text-xs font-semibold text-[var(--text-subtle)]">
                      กำลังเลี้ยง
                    </Badge>
                  )}
                </div>
                <p className="db-row-meta">
                  {formatDragonGrowthThai(dragon.growth)} ·{" "}
                  {dragon.points.toLocaleString("th-TH")} แต้ม
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
