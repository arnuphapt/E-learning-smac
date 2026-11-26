"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useLiveSession } from "@/lib/hooks";
import { HostQuestion, type HostQuestionState } from "@/components/live/host-question";
import { HostReveal, type HostRevealState } from "@/components/live/host-reveal";
import { HostLeaderboard, type HostLeaderboardState } from "@/components/live/host-leaderboard";
import { HostEnded, type HostEndedState } from "@/components/live/host-ended";
import { HostLobby, type LobbyPlayer, type LobbyTeam } from "@/components/live/host-lobby";
import { useConfirm } from "@/components/common/confirm";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as sound from "@/lib/live-sound";
import { bg, assetExists } from "@/lib/live-assets";

function getErrorField(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "error" in data) {
    const errVal = (data as { error: unknown }).error;
    return typeof errVal === "string" ? errVal : undefined;
  }
  return undefined;
}

export default function HostLiveSessionPage() {
  const params = useParams();
  const confirm = useConfirm();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const { state, error, refresh, signal } = useLiveSession(id, { isHost: true });
  const [siteUrl, setSiteUrl] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  const lastPhaseKeyRef = useRef<string | null>(null);
  const prevPlayerCountRef = useRef<number | null>(null);

  // Initialize sound engine for host role & read persisted mute state
  useEffect(() => {
    const { muted: initialMuted } = sound.init({ role: "host" });
    setMuted(initialMuted);
  }, []);

  // Unlock audio on first user gesture anywhere on host screen
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

  // Music & phase SFX transitions (guarded with phase + index, not on every refetch)
  useEffect(() => {
    if (!state) return;
    const phase = state.phase;
    const index = state.current_index ?? -1;
    const phaseKey = `${phase}:${index}`;

    if (lastPhaseKeyRef.current === phaseKey) {
      return;
    }
    lastPhaseKeyRef.current = phaseKey;

    if (phase === "lobby") {
      sound.music("lobby");
      sound.duck(false);
    } else if (phase === "question") {
      sound.music("play");
      sound.duck(false);
      sound.play("start");
    } else if (phase === "reveal") {
      sound.music("play");
      sound.duck(true);
      sound.play("reveal");
    } else if (phase === "leaderboard") {
      sound.music("play");
      sound.duck(false);
      sound.play("points");
    } else if (phase === "ended") {
      sound.music("podium");
      sound.duck(false);
      sound.play("podium");
    }
  }, [state?.phase, state?.current_index]);

  // Cleanup music and ducking on unmount
  useEffect(() => {
    return () => {
      sound.stopMusic();
      sound.duck(false);
    };
  }, []);

  // Play 'join' sfx when player count grows in lobby
  useEffect(() => {
    if (!state || state.phase !== "lobby") {
      prevPlayerCountRef.current = null;
      return;
    }
    const currentCount = Array.isArray(state.players) ? state.players.length : 0;
    if (prevPlayerCountRef.current !== null && currentCount > prevPlayerCountRef.current) {
      sound.play("join");
    }
    prevPlayerCountRef.current = currentCount;
  }, [state?.phase, state?.players]);

  // Background resolution per phase (lobby / play / podium)
  useEffect(() => {
    if (!state) return;
    const targetBg =
      state.phase === "lobby"
        ? bg.lobby
        : state.phase === "ended"
        ? bg.podium
        : bg.play;

    let active = true;
    assetExists(targetBg).then((exists) => {
      if (active) {
        setBgUrl(exists ? targetBg : null);
      }
    });

    return () => {
      active = false;
    };
  }, [state?.phase]);

  const handleToggleMute = async () => {
    await sound.unlock();
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
  };

  const handleMoveTeam = useCallback(
    async (userId: string, targetTeamId: string) => {
      if (!id || !userId || !targetTeamId || movingPlayerId) return;
      try {
        setMovingPlayerId(userId);
        const res = await fetch(`/api/live/${id}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, team_id: targetTeamId }),
        });
        if (!res.ok) {
          const errData: unknown = await res.json().catch(() => ({}));
          console.warn("Move team error:", getErrorField(errData) || res.statusText);
        }
        await refresh();
      } catch (e) {
        console.error("Move team failed:", e);
      } finally {
        setMovingPlayerId(null);
      }
    },
    [id, movingPlayerId, refresh]
  );

  // Returns a Thai error message, or null on success.
  const handleRenameTeam = useCallback(
    async (teamId: string, name: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/live/teams/${teamId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const errData: unknown = await res.json().catch(() => ({}));
          return getErrorField(errData) || "เปลี่ยนชื่อทีมไม่สำเร็จ";
        }
        await refresh();
        signal();
        return null;
      } catch {
        return "เปลี่ยนชื่อทีมไม่สำเร็จ";
      }
    },
    [refresh, signal]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteUrl(`${window.location.origin}/s/live/quiz`);
    }
  }, []);

  const handleAdvance = useCallback(
    async (action: string): Promise<boolean> => {
      sound.unlock();
      if (!id || advancing) return false;
      try {
        setAdvancing(true);
        const res = await fetch(`/api/live/${id}/advance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        // 409 conflict (e.g. duplicate reveal or already transitioned) is safely ignored
        if (!res.ok && res.status !== 409) {
          const errData: unknown = await res.json().catch(() => ({}));
          console.warn("Advance warning:", getErrorField(errData) || res.statusText);
        }
        // Realtime also triggers a fetch; start one now without blocking `advancing` on it.
        void refresh();
        return res.ok || res.status === 409;
      } catch (e) {
        console.error("Advance failed:", e);
        return false;
      } finally {
        setAdvancing(false);
      }
    },
    [id, advancing, refresh]
  );

  const handleEndGame = async () => {
    const ok = await confirm({
      danger: true,
      title: "จบการแข่งขัน",
      message: "ต้องการจบเกมทันทีหรือไม่?",
      confirmText: "จบเกม",
      cancelText: "ยกเลิก",
    });
    if (ok) handleAdvance("end");
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <ErrorState
          title="เกิดข้อผิดพลาดในการโหลดห้อง"
          description={error.message || "ไม่สามารถเชื่อมต่อห้องควิซได้"}
          onRetry={() => refresh()}
          className="max-w-md"
        />
        <Button asChild variant="outline" className="absolute bottom-10">
          <Link href="/i/live/hubs">กลับหน้ารายการห้อง</Link>
        </Button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <LoadingState label="กำลังเชื่อมต่อห้องควิซสด..." />
      </div>
    );
  }

  const players: LobbyPlayer[] = Array.isArray(state.players) ? (state.players as LobbyPlayer[]) : [];
  const teams: LobbyTeam[] = Array.isArray(state.teams) ? (state.teams as LobbyTeam[]) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-x-hidden overflow-y-auto bg-background p-4 text-foreground select-none sm:p-8">
      {/* Phase background image (computed url) with a light overlay keeping text contrast >= 4.5:1 */}
      {bgUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${bgUrl})` }}
        >
          <div className="absolute inset-0 bg-background/90 backdrop-blur-[1px]" />
        </div>
      )}

      <header className="relative z-10 flex items-center justify-between gap-4 border-b pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/i/live/hubs">
              <ArrowLeftIcon />
              หน้ารายการห้อง
            </Link>
          </Button>
          <span className="max-w-sm truncate text-base font-bold text-foreground sm:max-w-md sm:text-lg">{state.title}</span>
          {state.phase !== "lobby" && (
            <Badge variant="outline" className="bg-card px-3 py-1 text-sm text-muted-foreground">
              ข้อ {state.current_index + 1}/{state.total}
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleMute}
            aria-pressed={muted}
            aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
            title={muted ? "เปิดเสียง" : "ปิดเสียง"}
            className="rounded-full"
          >
            {muted ? <VolumeXIcon className="text-destructive" /> : <Volume2Icon className="text-success" />}
            {muted ? "ปิดเสียงอยู่" : "เปิดเสียง"}
          </Button>

          {state.phase !== "ended" && (
            <Button variant="destructive" size="sm" onClick={handleEndGame} disabled={advancing} title="จบการแข่งขันทันที">
              จบเกม
            </Button>
          )}

          <Badge variant="outline" className="hidden gap-2 bg-card px-3.5 py-1.5 font-mono text-sm font-bold sm:inline-flex sm:text-base">
            <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-emerald-500" />
            PIN: {state.pin}
          </Badge>
        </div>
      </header>

      <div className="relative z-10 my-2 flex flex-1 flex-col justify-center sm:my-4">
        {state.phase === "lobby" && (
          <HostLobby
            pin={state.pin}
            total={state.total}
            teamMode={!!state.team_mode}
            players={players}
            teams={teams}
            siteUrl={siteUrl}
            advancing={advancing}
            movingPlayerId={movingPlayerId}
            onStart={() => handleAdvance("start")}
            onMoveTeam={handleMoveTeam}
            onRenameTeam={handleRenameTeam}
          />
        )}

        {state.phase === "question" && (
          <HostQuestion state={state as unknown as HostQuestionState} onAdvance={handleAdvance} />
        )}

        {state.phase === "reveal" && (
          <HostReveal state={state as unknown as HostRevealState} onAdvance={handleAdvance} advancing={advancing} />
        )}

        {state.phase === "leaderboard" && (
          <HostLeaderboard state={state as unknown as HostLeaderboardState} onAdvance={handleAdvance} advancing={advancing} />
        )}

        {state.phase === "ended" && (
          <HostEnded state={state as unknown as HostEndedState} />
        )}
      </div>
    </div>
  );
}
