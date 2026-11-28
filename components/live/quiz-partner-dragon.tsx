"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  QuizPartnerDragonController,
  QuizPartnerRect,
} from "@/lib/dragon/podium-renderer.mjs";
import {
  pickPartnerChoiceIndex,
  type QuizPartnerDragonInfo,
} from "@/lib/quiz-partner-dragon";

let loggedLoadFailure = false;

export interface QuizPartnerDragonProps {
  partner: QuizPartnerDragonInfo | null;
  questionIndex: number;
  choiceCount: number;
  sessionId: string;
  takingOff: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export function QuizPartnerDragon({
  partner,
  questionIndex,
  choiceCount,
  sessionId,
  takingOff,
  gridRef,
}: QuizPartnerDragonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<QuizPartnerDragonController | null>(null);
  const takingOffRef = useRef(takingOff);
  const questionKeyRef = useRef<string>("");

  useEffect(() => {
    takingOffRef.current = takingOff;
  }, [takingOff]);

  const measureTargetRect = useCallback((): QuizPartnerRect | null => {
    const host = hostRef.current;
    const grid = gridRef.current;
    if (!host || !grid || choiceCount <= 0) return null;

    const idx = pickPartnerChoiceIndex(questionIndex, choiceCount, sessionId);
    if (idx < 0) return null;

    const tiles = grid.querySelectorAll<HTMLElement>("[data-choice-tile]");
    const tile = tiles[idx];
    if (!tile) return null;

    const hostRect = host.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    if (tileRect.width <= 0 || tileRect.height <= 0) return null;

    return {
      left: tileRect.left - hostRect.left,
      top: tileRect.top - hostRect.top,
      width: tileRect.width,
      height: tileRect.height,
    };
  }, [choiceCount, gridRef, questionIndex, sessionId]);

  const measureRef = useRef(measureTargetRect);
  useEffect(() => {
    measureRef.current = measureTargetRect;
  }, [measureTargetRect]);

  useEffect(() => {
    if (!partner) return;
    const host = hostRef.current;
    if (!host) return;

    const abort = new AbortController();
    let mountedCtrl: QuizPartnerDragonController | null = null;

    (async () => {
      try {
        const { mountQuizPartnerDragon } = await import(
          "@/lib/dragon/podium-renderer.mjs"
        );
        if (abort.signal.aborted) return;

        const ctrl = await mountQuizPartnerDragon(host, {
          speciesId: partner.speciesId,
          isPartner: partner.isPartner,
          signal: abort.signal,
        });
        if (!ctrl) return;
        if (abort.signal.aborted) {
          ctrl.destroy();
          return;
        }
        mountedCtrl = ctrl;
        controllerRef.current = ctrl;

        if (!takingOffRef.current) {
          const rect = measureRef.current();
          if (rect) {
            questionKeyRef.current = `${questionIndex}:${choiceCount}`;
            ctrl.flyTo(rect);
          }
        }
      } catch (err) {
        if (abort.signal.aborted) return;
        if (!loggedLoadFailure) {
          loggedLoadFailure = true;
          console.warn("QuizPartnerDragon failed to load:", err);
        }
      }
    })();

    return () => {
      abort.abort();
      if (controllerRef.current === mountedCtrl) {
        controllerRef.current = null;
      }
      mountedCtrl?.destroy();
    };
    // Mount once per partner species; question changes trigger flyTo below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner?.speciesId]);

  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || !partner) return;

    if (takingOff) {
      ctrl.takeOff();
      return;
    }

    const nextKey = `${questionIndex}:${choiceCount}`;
    const rect = measureTargetRect();
    if (!rect) return;
    if (questionKeyRef.current !== nextKey) {
      questionKeyRef.current = nextKey;
      ctrl.flyTo(rect);
    } else {
      ctrl.reposition(rect);
    }
  }, [partner, questionIndex, choiceCount, takingOff, measureTargetRect]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const rect = measureRef.current();
      if (rect) controllerRef.current?.reposition(rect);
    });
    ro.observe(grid);
    return () => ro.disconnect();
  }, [gridRef]);

  if (!partner) return null;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    />
  );
}
