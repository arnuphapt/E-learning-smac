"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, HelpCircleIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { poppins } from "@/components/dragon/dragon-base-theme";
import type { DragonBaseApi } from "@/lib/dragon/engine.mjs";
import { DRAGON_GROWTH_THRESHOLDS } from "@/lib/dragon-growth";
import {
  toHatcherySave,
  toSummoningHatcherySave,
  type DragonSceneInputItem,
  type DragonSourceMap,
} from "@/lib/dragon-scene";
import { cn } from "@/lib/utils";
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
  allowSummon?: boolean;
  allowPartner?: boolean;
  allowAdultDrag?: boolean;
  walletBalance?: number;
  summonFirstEgg?: boolean;
  onHatched?: () => void | Promise<void>;
  onSummoned?: () => void | Promise<void>;
  onPartnerChanged?: () => void | Promise<void>;
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
  allowSummon = false,
  allowPartner = false,
  allowAdultDrag = false,
  walletBalance = 0,
  summonFirstEgg = false,
  onHatched,
  onSummoned,
  onPartnerChanged,
  onLoadError,
}: DragonSceneViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<DragonSourceMap | null>(null);
  const hatcheryKeyRef = useRef<string>("");
  const dragonsRef = useRef(dragons);
  const allowSummonRef = useRef(allowSummon);
  const allowPartnerRef = useRef(allowPartner);
  const summonFirstEggRef = useRef(summonFirstEgg);
  const summoningDragonIdRef = useRef<string | null>(null);
  const partnerControllerRef = useRef<AbortController | null>(null);
  const onHatchedRef = useRef(onHatched);
  const onSummonedRef = useRef(onSummoned);
  const onPartnerChangedRef = useRef(onPartnerChanged);
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => {
    dragonsRef.current = dragons;
    allowSummonRef.current = allowSummon;
    allowPartnerRef.current = allowPartner;
    summonFirstEggRef.current = summonFirstEgg;
    onHatchedRef.current = onHatched;
    onSummonedRef.current = onSummoned;
    onPartnerChangedRef.current = onPartnerChanged;
    onLoadErrorRef.current = onLoadError;
  }, [dragons, allowSummon, allowPartner, summonFirstEgg, onHatched, onSummoned, onPartnerChanged, onLoadError]);
  const [api, setApi] = useState<DragonBaseApi | null>(null);
  const [ui, setUi] = useState<DragonViewUi | null>(null);
  const [memoryStorage, setMemoryStorage] = useState<ReturnType<
    typeof createMemoryStorage
  > | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [error, setError] = useState<string>("");
  const [interaction, setInteraction] = useState<DragonInteraction | null>(null);
  const [selectedOpen, setSelectedOpen] = useState(false);
  const [summonPromptOpen, setSummonPromptOpen] = useState(false);
  const [buyingEgg, setBuyingEgg] = useState(false);
  const [summonError, setSummonError] = useState("");
  const [summoningDragonId, setSummoningDragonId] = useState<string | null>(null);
  const [partnerPendingId, setPartnerPendingId] = useState<string | null>(null);
  useEffect(() => {
    summoningDragonIdRef.current = summoningDragonId;
  }, [summoningDragonId]);
  const handleHatcherySnapshot = useCallback(
    (snap: { active?: { id: string; status: string } | null }) => {
      const id = summoningDragonIdRef.current;
      if (!id || !dragonsRef.current.some((d) => d.id === id)) return;
      if (
        !snap?.active ||
        snap.active.id !== id ||
        !["summoning", "arriving"].includes(snap.active.status)
      ) {
        setSummoningDragonId(null);
      }
    },
    [],
  );
  useEffect(() => () => partnerControllerRef.current?.abort(), []);

  const onInteract = useCallback((event: DragonInteraction) => {
    if (event.kind === "dismiss-hatchery") {
      setSelectedOpen(false);
      return;
    }
    if (event.kind === "hatchery" && (event.actorId || allowSummonRef.current)) {
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

        mapRef.current = map;
        hatcheryKeyRef.current = HATCHERY_KEY;
        const currentDragons = dragonsRef.current;
        const save =
          summonFirstEggRef.current && currentDragons.length > 0
            ? toSummoningHatcherySave(currentDragons[0], map)
            : toHatcherySave(currentDragons, map, {
                summoningDragonId: summoningDragonIdRef.current,
              });
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
          allowSummon,
          allowPartner,
          allowAdultDrag,
          fogEnabled: false,
          onProgress: (loaded, total) => setProgress([loaded, total]),
          onInteract,
        });
        engine = nextApi;

        if (controller.signal.aborted) {
          nextApi.destroy();
          return;
        }

        if (summonFirstEggRef.current || summoningDragonIdRef.current) {
          nextApi.focusAt("IncubatorEggMarker", 14);
        }

        (window as { __dragonSceneApi?: DragonBaseApi }).__dragonSceneApi =
          nextApi;
        setApi(nextApi);
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err as { name?: string })?.name === "AbortError"
        ) {
          return;
        }
        const msg =
          err instanceof Error ? err.message : "ไม่สามารถเปิดฐานมังกรได้";
        setError(msg);
        onLoadErrorRef.current?.(msg);
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
  }, [allowHatch, allowSummon, allowPartner, allowAdultDrag, onInteract]);

  useEffect(() => {
    const map = mapRef.current;
    const key = hatcheryKeyRef.current;
    if (!api || !map || !memoryStorage || !key) return;
    const save =
      summonFirstEgg && dragons.length > 0
        ? toSummoningHatcherySave(dragons[0], map)
        : toHatcherySave(dragons, map, { summoningDragonId });
    memoryStorage.setItem(key, JSON.stringify(save));
    api.hatcheryModel?.tick?.();
    if (summonFirstEgg || summoningDragonId) {
      api.focusAt("IncubatorEggMarker", 14);
    }
  }, [api, memoryStorage, dragons, summonFirstEgg, summoningDragonId]);

  const handleSummonRequest = useCallback(() => {
    setSummonError("");
    setSummonPromptOpen(true);
  }, []);

  const handleConfirmSummon = useCallback(async () => {
    if (buyingEgg) return;
    setBuyingEgg(true);
    setSummonError("");
    try {
      const res = await fetch("/api/dragon/egg", { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        dragon_id?: string;
        error?: string;
      } | null;
      if (!res.ok || !body?.dragon_id) {
        setSummonError(body?.error || "ไม่สามารถอัญเชิญไข่ใบใหม่ได้");
        return;
      }
      setSummonPromptOpen(false);
      setSelectedOpen(false);
      setSummoningDragonId(body.dragon_id);
      toast.success("อัญเชิญไข่มังกรใบใหม่เรียบร้อยแล้ว");
      try {
        await onSummonedRef.current?.();
      } catch {
        toast.error("โหลดข้อมูลมังกรไม่สำเร็จ กรุณารีเฟรชหน้านี้");
      }
    } catch {
      setSummonError("ไม่สามารถอัญเชิญไข่ใบใหม่ได้");
    } finally {
      setBuyingEgg(false);
    }
  }, [buyingEgg]);

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

  const handlePartnerRequest = useCallback(
    async (dragonId: string) => {
      if (!allowPartnerRef.current || partnerPendingId) return;
      partnerControllerRef.current?.abort();
      const controller = new AbortController();
      partnerControllerRef.current = controller;
      setPartnerPendingId(dragonId);
      try {
        const res = await fetch("/api/dragon/partner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dragon_id: dragonId }),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          toast.error(body?.error || "ไม่สามารถเลือกมังกรคู่ใจได้");
          return;
        }
        const key = hatcheryKeyRef.current;
        const raw = key ? memoryStorage?.getItem(key) : null;
        if (raw && key && memoryStorage) {
          const saved = JSON.parse(raw) as {
            active?: { id: string; isPartner?: boolean } | null;
            babies?: Array<{ id: string; isPartner?: boolean }>;
            adults?: Array<{ id: string; isPartner?: boolean }>;
          };
          if (saved.active) saved.active.isPartner = saved.active.id === dragonId;
          for (const b of saved.babies ?? []) b.isPartner = b.id === dragonId;
          for (const a of saved.adults ?? []) a.isPartner = a.id === dragonId;
          memoryStorage.setItem(key, JSON.stringify(saved));
          api?.hatcheryModel?.tick?.();
        }
        toast.success("ตั้งเป็นมังกรคู่ใจเรียบร้อยแล้ว");
        try {
          await onPartnerChangedRef.current?.();
        } catch {
          toast.error("โหลดข้อมูลมังกรไม่สำเร็จ กรุณารีเฟรชหน้านี้");
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err as { name?: string })?.name === "AbortError"
        ) {
          return;
        }
        toast.error("ไม่สามารถเลือกมังกรคู่ใจได้");
      } finally {
        if (!controller.signal.aborted) {
          setPartnerPendingId(null);
        }
      }
    },
    [api, memoryStorage, partnerPendingId],
  );

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
          allowSummon={allowSummon}
          allowSummonTick={summonFirstEgg || Boolean(summoningDragonId)}
          allowPartner={allowPartner}
          partnerPendingId={partnerPendingId}
          onHatch={handleHatch}
          onHatchNotReady={handleHatchNotReady}
          onHatchComplete={handleHatchComplete}
          onSummonRequest={handleSummonRequest}
          onPartnerRequest={handlePartnerRequest}
          onSnapshot={handleHatcherySnapshot}
          onClose={closeHatchery}
        />
      )}
      {allowSummon && (
        <AlertDialog
          open={summonPromptOpen}
          onOpenChange={(next) => {
            if (!buyingEgg) setSummonPromptOpen(next);
          }}
        >
          <AlertDialogContent
            className={cn("dragon-base db-panel", poppins.variable)}
          >
            <AlertDialogTitle className="sr-only">
              อัญเชิญไข่ใบใหม่
            </AlertDialogTitle>
            <div className="db-prompt">
              <div className="db-prompt-mark flex items-center justify-center" aria-hidden>
                <HelpCircleIcon className="size-14 text-[var(--frame)]" />
              </div>
              <AlertDialogDescription className="db-prompt-text">
                {summonError
                  ? summonError
                  : walletBalance < DRAGON_GROWTH_THRESHOLDS.eggPrice
                    ? `แต้มไม่พอ ต้องใช้ ${DRAGON_GROWTH_THRESHOLDS.eggPrice.toLocaleString("th-TH")} แต้ม จึงจะอัญเชิญไข่ใบใหม่ได้`
                    : `ใช้ ${DRAGON_GROWTH_THRESHOLDS.eggPrice.toLocaleString("th-TH")} แต้มเพื่ออัญเชิญไข่ใบใหม่ ไข่ใบใหม่จะกลายเป็นมังกรที่กำลังเลี้ยง ยืนยันไหม`}
              </AlertDialogDescription>
              <div className="db-prompt-actions">
                {summonError ||
                walletBalance < DRAGON_GROWTH_THRESHOLDS.eggPrice ? (
                  <AlertDialogCancel
                    className="db-btn db-btn--default"
                    aria-label="ปิด"
                  >
                    ตกลง
                  </AlertDialogCancel>
                ) : (
                  <>
                    <AlertDialogCancel
                      className="db-btn db-btn--cancel db-btn--icon"
                      aria-label="ยกเลิก"
                      disabled={buyingEgg}
                    >
                      <XIcon className="size-7" aria-hidden />
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="db-btn db-btn--premium db-btn--icon"
                      aria-label="ยืนยันอัญเชิญไข่"
                      disabled={buyingEgg}
                      onClick={(e) => {
                        e.preventDefault();
                        void handleConfirmSummon();
                      }}
                    >
                      <CheckIcon className="size-7" aria-hidden />
                    </AlertDialogAction>
                  </>
                )}
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
