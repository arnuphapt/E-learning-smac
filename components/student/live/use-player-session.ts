"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLiveSession } from "@/lib/hooks";
import * as sound from "@/lib/live-sound";
import { bg, assetExists } from "@/lib/live-assets";
import type { PlayerSessionViewState, TeamInfo } from "./types";

const noopSubscribe = () => () => {};

/** Everything the student live room needs: the polled session, sound toggle, background asset and the player's team + rank. */
export function usePlayerSession(id: string | undefined) {
  const { state: rawState, error, refresh } = useLiveSession(id, { isHost: false });
  const state = rawState as PlayerSessionViewState | null;
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false); // portal needs document
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [muted, setMuted] = useState(true);
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  // Initialize sound engine for player role (muted by default) & read persisted state
  useEffect(() => {
    const { muted: initialMuted } = sound.init({ role: "player" });
    const t = setTimeout(() => setMuted(initialMuted), 0); // from a callback, not the effect body
    return () => clearTimeout(t);
  }, []);

  // Unlock audio on first user gesture anywhere on screen
  useEffect(() => {
    const handleFirstInteraction = () => {
      sound.unlock();
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
    window.addEventListener("pointerdown", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  // Resolve player background (bg.play when asset exists, else none)
  useEffect(() => {
    let active = true;
    assetExists(bg.play).then((exists) => {
      if (active) setBgUrl(exists ? bg.play : null);
    });
    return () => {
      active = false;
    };
  }, []);

  // "เปิดเสียง" toggle that also calls unlock()
  const toggleMute = async () => {
    await sound.unlock();
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
  };

  // Remember the team once the server has sent it (later states may omit it)
  useEffect(() => {
    const myTeam = state?.me?.team;
    if (!myTeam) return;
    const t = setTimeout(() => setTeamInfo((prev) => ({ ...prev, ...myTeam, rank: myTeam.rank ?? prev?.rank ?? null })), 0);
    return () => clearTimeout(t);
  }, [state?.me?.team]);

  const activeTeam = state?.me?.team || teamInfo;
  const activeTeamStanding =
    Array.isArray(state?.teamBoard) && activeTeam
      ? state.teamBoard.find((t) => t.name === activeTeam.name || t.id === activeTeam.id)
      : null;
  let activeRank = state?.me?.team?.rank ?? teamInfo?.rank ?? activeTeamStanding?.rank ?? null;
  if (!activeRank && activeTeam && Array.isArray(state?.teamBoard)) {
    const bIdx = state.teamBoard.findIndex((t) => t.name === activeTeam.name || t.id === activeTeam.id);
    if (bIdx >= 0) activeRank = bIdx + 1;
  }
  const isRankPhase = state?.phase === "reveal" || state?.phase === "leaderboard" || state?.phase === "ended";

  return { state, error, refresh, mounted, muted, toggleMute, bgUrl, activeTeam, activeTeamStanding, activeRank, isRankPhase };
}
