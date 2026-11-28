"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { EggIcon, Gamepad2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTeamStyle } from "@/components/live/team-colors";
import type { DragonSceneInputItem } from "@/lib/dragon-scene";
import { cn } from "@/lib/utils";
import type { TeamInfo } from "./types";

const LazyDragonSceneView = dynamic(
  () =>
    import("@/components/dragon/dragon-game").then((m) => m.DragonSceneView),
  { ssr: false },
);

/** Waiting room: joined confirmation, the player's team and how many are in. */
export function LobbyView({
  team,
  playerCount,
  firstEgg = false,
}: {
  team: TeamInfo | null | undefined;
  playerCount: number;
  firstEgg?: boolean;
}) {
  const style = team ? getTeamStyle(team.colorNo ?? 0) : null;
  const [firstDragon, setFirstDragon] = useState<DragonSceneInputItem | null>(
    null,
  );
  const [sceneFailed, setSceneFailed] = useState(false);

  useEffect(() => {
    if (!firstEgg) return;
    const controller = new AbortController();
    fetch("/api/dragon/me", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as { dragons?: DragonSceneInputItem[] };
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const egg = payload.dragons?.[0] ?? null;
        if (egg) {
          setFirstDragon(egg);
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        console.error(
          "Failed to load first egg for lobby summon:",
          err instanceof Error ? err.message : err,
        );
      });

    return () => controller.abort();
  }, [firstEgg]);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 py-6 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full border-[3px] border-[var(--rim)] bg-[var(--surface-0)] text-[var(--gold)] shadow-md">
        <Gamepad2Icon className="size-9" />
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="db-world-label text-2xl font-black text-[var(--text)]">คุณเข้าสู่ห้องแล้ว!</h2>
        <p className="db-world-label text-xs text-[var(--text)] sm:text-sm">รอผู้สอนกดเริ่มเกมบนหน้าจอโปรเจกเตอร์</p>
      </div>

      {firstEgg && (
        <Card className="db-panel border-t-[var(--gold)] border-b-[var(--gold)] text-left">
          <CardContent className="flex flex-col gap-3 px-0">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]" aria-hidden>
                <EggIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className="border-transparent bg-[var(--gold)] font-bold text-slate-950">ใหม่</Badge>
                  <span className="text-sm font-bold text-[var(--text)]">ได้ไข่มังกรใบแรกแล้ว</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  สะสมแต้มจากการเล่นควิซเพื่อฟักไข่ในหน้ามังกรของฉัน
                </p>
              </div>
            </div>
            {firstDragon && !sceneFailed && (
              <div className="h-52 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--frame-soft)] bg-[var(--surface-well)] sm:h-60">
                <LazyDragonSceneView
                  dragons={[firstDragon]}
                  summonFirstEgg
                  onLoadError={(msg) => {
                    console.error("Lobby summon scene failed:", msg);
                    setSceneFailed(true);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {team && style && (
        <Card className={cn("db-panel text-left", style.border)}>
          <CardContent className="px-0">
            <div className="mb-1 text-[11px] font-semibold text-[var(--text-muted)]">ทีมที่คุณสังกัด</div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-full text-base font-bold text-white shadow-xs", style.dot)}>
                  {team.name?.[0] || "T"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold text-[var(--text)]">ทีม{team.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">สี{team.name}</div>
                </div>
              </div>
              <Badge variant="outline" className={cn("shrink-0 px-3 py-1 font-bold", style.badge)}>ทีม{team.name}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="db-panel">
        <CardContent className="px-0">
          <span className="mb-1 block text-xs text-[var(--text-muted)]">จำนวนผู้เข้าร่วมในห้อง</span>
          <div className="font-mono text-3xl font-black text-[var(--gold)] tabular-nums">
            {playerCount} <span className="text-sm font-normal text-[var(--text-muted)]">คน</span>
          </div>
        </CardContent>
      </Card>

      <div className="db-world-label flex items-center justify-center gap-1.5 text-xs text-[var(--text)]">
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--accept)]" />
        <span>ระบบจะเปลี่ยนหน้าจออัตโนมัติเมื่อเริ่มเกม</span>
      </div>
    </div>
  );
}
