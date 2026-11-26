"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DragonBaseApi } from "@/lib/dragon/engine.mjs";
import { createBabyMoveController } from "./baby-move";
import "./dragon-game.css";

interface DragonInteraction {
  kind: string;
  actorId?: string;
  roomID?: string;
}

interface DragonUiComponents {
  HatcheryFeature: ReturnType<typeof import("@/lib/dragon/hatchery-panel.mjs").createHatcheryFeature>;
  ExpansionStatus: ReturnType<typeof import("@/lib/dragon/native-expansion-status.mjs").createNativeExpansionStatus>;
  NativeHud: ReturnType<typeof import("@/lib/dragon/native-hud.mjs").createNativeHud>;
}

declare global {
  interface Window {
    hatchBase?: DragonBaseApi;
  }
}

export function DragonGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<DragonBaseApi | null>(null);
  const [api, setApi] = useState<DragonBaseApi | null>(null);
  const [ui, setUi] = useState<DragonUiComponents | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [error, setError] = useState<string>("");
  const [expansionRoom, setExpansionRoom] = useState<string | null>(null);
  const [babyInteraction, setBabyInteraction] = useState<DragonInteraction | null>(null);
  const [babyOpen, setBabyOpen] = useState(false);
  const [summonOpen, setSummonOpen] = useState(false);

  const notifyCurrency = useCallback((currency: string) => {
    if (currency === "HC" || currency === "HC_PLURAL") {
      toast.info("เพชรไม่พอ — ใช้เหรียญทองในการถางหมอกหรือเรียกไข่");
      return;
    }
    toast.info("เหรียญไม่พอ — เลี้ยงลูกมังกรและเก็บเหรียญจากมังกรโตเพื่อสะสมเพิ่ม");
  }, []);

  const onInteract = useCallback((event: DragonInteraction) => {
    if (event.kind === "dismiss-hatchery") {
      setSummonOpen(false);
      setBabyOpen(false);
      return;
    }
    if (event.kind === "expansion" && event.roomID) {
      setExpansionRoom(event.roomID);
      setBabyOpen(false);
      setSummonOpen(false);
      return;
    }
    if (event.kind !== "hatchery") return;
    setExpansionRoom(null);
    if (!event.actorId) {
      setBabyOpen(false);
      setBabyInteraction(null);
      setSummonOpen(true);
      apiRef.current?.focusAt("IncubatorEggMarker", 14);
      return;
    }
    const model = apiRef.current?.hatcheryModel;
    const baby = model?.tick().babies.find((b: { id: string }) => b.id === event.actorId);
    if (!baby) {
      setSummonOpen(false);
      setBabyInteraction(event);
      setBabyOpen(true);
      return;
    }
    if (baby.feeding.status === "maturing") return;
    setSummonOpen(false);
    if (baby.feeding.status === "mature-ready") {
      try {
        model.matureBaby(baby.id);
        setBabyOpen(false);
      } catch (err) {
        console.error(err);
      }
      return;
    }
    setBabyInteraction(event);
    setBabyOpen(true);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new AbortController();
    let engine: DragonBaseApi | null = null;

    (async () => {
      try {
        const [PIXI, { resetGameDataOnce }] = await Promise.all([
          import("pixi.js"),
          import("@/lib/dragon/game-reset.mjs"),
        ]);
        if (controller.signal.aborted) return;

        resetGameDataOnce(localStorage, sessionStorage);
        (globalThis as { PIXI?: unknown }).PIXI = PIXI;

        const [
          { createBase },
          { createHatcheryFeature },
          { createNativeExpansionStatus },
          { createNativeHud },
        ] = await Promise.all([
          import("@/lib/dragon/engine.mjs"),
          import("@/lib/dragon/hatchery-panel.mjs"),
          import("@/lib/dragon/native-expansion-status.mjs"),
          import("@/lib/dragon/native-hud.mjs"),
        ]);
        if (controller.signal.aborted) return;

        setUi({
          HatcheryFeature: createHatcheryFeature(React),
          ExpansionStatus: createNativeExpansionStatus(React),
          NativeHud: createNativeHud(React),
        });

        const nextApi = await createBase(host, {
          signal: controller.signal,
          onProgress: (loaded, total) => setProgress([loaded, total]),
          onInteract,
        });
        engine = nextApi;

        if (controller.signal.aborted) {
          nextApi.destroy();
          return;
        }

        const moveController = createBabyMoveController({
          getModel: () => nextApi.hatcheryModel,
          renderer: nextApi.hatcheryRenderer,
          setState: (state) => nextApi.setBabyMoveState(state),
          onError: (err) => console.error(err),
        });
        nextApi.setBabyMoveHandlers(moveController);
        nextApi.requestCurrencyShop = (currency: string) => notifyCurrency(currency);

        window.hatchBase = nextApi;
        apiRef.current = nextApi;
        setApi(nextApi);
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "ไม่สามารถเปิดฐานมังกรได้");
        }
      }
    })();

    return () => {
      controller.abort();
      engine?.destroy();
      if (engine && window.hatchBase === engine) {
        delete window.hatchBase;
      }
      apiRef.current = null;
      setApi(null);
    };
  }, [onInteract, notifyCurrency]);

  const closeHatchery = useCallback(() => {
    setSummonOpen(false);
    setBabyOpen(false);
  }, []);

  useEffect(() => {
    if (!summonOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSummonOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [summonOpen]);

  const HatcheryFeature = ui?.HatcheryFeature;
  const ExpansionStatus = ui?.ExpansionStatus;
  const NativeHud = ui?.NativeHud;

  return (
    <div className="dragon-game">
      <div className="world" ref={hostRef} />
      {(!api || error) && (
        <div className="boot" role="status">
          <strong>{error ? "เปิดฐานไม่สำเร็จ" : "กำลังเปิดป่ามังกร…"}</strong>
          <p>{error || `กำลังโหลดภาพ ${progress[0]} / ${progress[1]}`}</p>
        </div>
      )}
      {api && NativeHud && (
        <NativeHud api={api} onOpenCurrency={notifyCurrency} />
      )}
      {api && expansionRoom && ExpansionStatus && (
        <ExpansionStatus
          api={api}
          roomID={expansionRoom}
          onClose={() => setExpansionRoom(null)}
        />
      )}
      {api && HatcheryFeature && (
        <HatcheryFeature
          api={api}
          open={babyOpen || summonOpen}
          interaction={babyInteraction}
          nurseryOnly={!summonOpen}
          onClose={closeHatchery}
        />
      )}
    </div>
  );
}
