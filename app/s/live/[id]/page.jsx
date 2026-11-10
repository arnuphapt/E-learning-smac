"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLiveSession } from "@/lib/hooks";
import { PlayerQuestion } from "@/components/live/PlayerQuestion";
import { PlayerReveal } from "@/components/live/PlayerReveal";
import { PlayerLeaderboard } from "@/components/live/PlayerLeaderboard";
import { PlayerEnded } from "@/components/live/PlayerEnded";
import * as sound from "@/lib/live-sound";
import { bg, assetExists } from "@/lib/live-assets";

const TEAM_COLORS = {
  1: { name: "แดง", bg: "bg-red-500", text: "text-red-700", border: "border-red-200", badge: "bg-red-50 text-red-700 border-red-200" },
  2: { name: "ฟ้า", bg: "bg-sky-500", text: "text-sky-700", border: "border-sky-200", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  3: { name: "เหลือง", bg: "bg-amber-500", text: "text-amber-800", border: "border-amber-200", badge: "bg-amber-50 text-amber-800 border-amber-200" },
  4: { name: "เขียว", bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  5: { name: "ม่วง", bg: "bg-purple-500", text: "text-purple-700", border: "border-purple-200", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  6: { name: "ส้ม", bg: "bg-orange-500", text: "text-orange-800", border: "border-orange-200", badge: "bg-orange-50 text-orange-800 border-orange-200" },
  7: { name: "ชมพู", bg: "bg-pink-500", text: "text-pink-700", border: "border-pink-200", badge: "bg-pink-50 text-pink-700 border-pink-200" },
  8: { name: "เทา", bg: "bg-slate-500", text: "text-slate-700", border: "border-slate-200", badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

function getTeamStyle(colorNo) {
  return (
    TEAM_COLORS[colorNo] || {
      name: "ทีม",
      bg: "bg-slate-500",
      text: "text-muted-foreground",
      border: "border-border",
      badge: "bg-muted text-foreground border-border",
    }
  );
}

export default function StudentLiveSessionPage() {
  const params = useParams();
  const id = params?.id;

  const { state, error, refresh } = useLiveSession(id, { isHost: false });
  const [mounted, setMounted] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [muted, setMuted] = useState(true);
  const [bgUrl, setBgUrl] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize sound engine for player role (muted by default) & read persisted state
  useEffect(() => {
    const { muted: initialMuted } = sound.init({ role: "player" });
    setMuted(initialMuted);
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

  // Resolve player background (bg.play when asset exists, else CSS gradient)
  useEffect(() => {
    let active = true;
    assetExists(bg.play).then((exists) => {
      if (active) {
        setBgUrl(exists ? bg.play : null);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // "เปิดเสียง" toggle that also calls unlock()
  const handleToggleMute = async () => {
    await sound.unlock();
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
  };

  useEffect(() => {
    if (state?.me?.team) {
      setTeamInfo((prev) => ({
        ...prev,
        ...state.me.team,
        rank: state.me.team.rank ?? prev?.rank ?? null,
      }));
    }
  }, [state?.me?.team]);

  const activeTeam = state?.me?.team || teamInfo;
  const activeTeamStanding =
    Array.isArray(state?.teamBoard) && activeTeam
      ? state.teamBoard.find(
          (t) => t.name === activeTeam.name || t.id === activeTeam.id
        )
      : null;
  let activeRank = state?.me?.team?.rank ?? teamInfo?.rank ?? activeTeamStanding?.rank ?? null;
  if (!activeRank && activeTeam && Array.isArray(state?.teamBoard)) {
    const bIdx = state.teamBoard.findIndex(
      (t) => t.name === activeTeam.name || t.id === activeTeam.id
    );
    if (bIdx >= 0) {
      activeRank = bIdx + 1;
    }
  }

  const teamStyle = activeTeam ? getTeamStyle(activeTeam.colorNo) : null;
  const isRankPhase =
    state?.phase === "reveal" ||
    state?.phase === "leaderboard" ||
    state?.phase === "ended";

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  if (error) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6 text-foreground"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)",
          paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)",
        }}
      >
        <div className="card max-w-md w-full bg-card rounded-[20px] p-8 shadow-sm border border-danger/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger-soft text-danger flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-foreground">เกิดข้อผิดพลาดในการโหลดห้อง</h1>
          <p className="text-sm text-muted-foreground">{error.message || "ไม่สามารถเชื่อมต่อห้องควิซได้"}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => refresh()}
              className="btn btn-primary"
            >
              ลองใหม่อีกครั้ง
            </button>
            <Link
              href="/s/live"
              className="btn btn-outline"
            >
              กลับหน้ารายการ
            </Link>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!state) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-muted-foreground"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">กำลังเชื่อมต่อห้องควิซสด…</p>
      </div>,
      document.body
    );
  }

  const playerCount = typeof state.players === "number" ? state.players : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-background text-foreground flex flex-col justify-between select-none font-sans overflow-y-auto overflow-x-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)",
        paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)",
      }}
    >
      {/* Dynamic Background Image with subtle light opacity if present */}
      {bgUrl && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-700 opacity-20"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />
      )}

      {/* Top Bar on Mobile */}
      <header className="relative z-10 flex items-center justify-between pb-3 border-b border-border gap-2">
        <div className="flex items-center gap-2 truncate">
          <Link
            href="/s/live"
            className="text-xs text-muted-foreground hover:text-foreground transition shrink-0 font-medium"
          >
            ← ออก
          </Link>
          <span className="text-xs text-border">|</span>
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[130px] sm:max-w-xs">
            {state.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sound Toggle (เปิดเสียง / ปิดเสียง) with unlock */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-pressed={!muted}
            aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
            title={muted ? "เปิดเสียง" : "ปิดเสียง"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
              muted
                ? "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground shadow-xs"
                : "bg-primary-soft text-primary-soft-fg border-primary/30 hover:bg-primary-soft/80"
            }`}
          >
            {muted ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <span>เปิดเสียง</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>ปิดเสียง</span>
              </>
            )}
          </button>


          {/* Player's team name + colour on phone header */}
          {activeTeam && (
            <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${teamStyle.badge}`}>
              <span className={`w-2 h-2 rounded-full ${teamStyle.bg} shrink-0`} />
              <span>ทีม{activeTeam.name}</span>
              {isRankPhase && activeRank && (
                <span className="text-[10px] font-bold text-amber-800">
                  อันดับ {activeRank}
                </span>
              )}
            </div>
          )}
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">สด</span>
        </div>
      </header>

      {/* Main Content by Phase */}
      <main className="relative z-10 flex-1 flex flex-col justify-center my-auto py-2">
        {/* Team Rank Banner in Reveal, Leaderboard, and Ended */}
        {activeTeam && isRankPhase && (
          <div className={`mb-3 p-3 rounded-[16px] border ${teamStyle.border} bg-card flex items-center justify-between shadow-xs max-w-md mx-auto w-full`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full ${teamStyle.bg} shrink-0`} />
              <span className="text-sm font-bold text-foreground">
                ทีม{activeTeam.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeTeamStanding && typeof activeTeamStanding.score === "number" && (
                <span className="text-xs font-mono font-bold text-primary mr-1">
                  {activeTeamStanding.score.toLocaleString()} คะแนน
                </span>
              )}
              <span className="text-xs text-muted-foreground">อันดับทีม:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-soft border border-primary/20 text-primary-soft-fg font-bold text-xs">
                {activeRank ? `อันดับ ${activeRank}` : "กำลังคำนวณ…"}
              </span>
            </div>
          </div>
        )}

        {state.phase === "lobby" && (
          <div className="text-center max-w-sm mx-auto w-full py-6 space-y-5">
            <div className="w-20 h-20 rounded-full bg-primary-soft border-2 border-primary/30 mx-auto flex items-center justify-center text-4xl shadow-sm">
              🎮
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-foreground">
                คุณเข้าสู่ห้องแล้ว!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                รอผู้สอนกดเริ่มเกมบนหน้าจอโปรเจกเตอร์
              </p>
            </div>

            {/* Player's team in lobby */}
            {activeTeam && (
              <div className={`p-4 rounded-[18px] border ${teamStyle.border} bg-card shadow-xs text-left`}>
                <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                  ทีมที่คุณสังกัด
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${teamStyle.bg} flex items-center justify-center text-white font-bold text-base shadow-xs`}>
                      {activeTeam.name?.[0] || "T"}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        ทีม{activeTeam.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        สี{activeTeam.name}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${teamStyle.badge}`}>
                    ทีม{activeTeam.name}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-[20px] p-5 shadow-xs">
              <span className="text-xs text-muted-foreground block mb-1">
                จำนวนผู้เข้าร่วมในห้อง
              </span>
              <div className="text-3xl font-black font-mono text-primary tabular-nums">
                {playerCount}{" "}
                <span className="text-sm font-normal text-muted-foreground">คน</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>ระบบจะเปลี่ยนหน้าจออัตโนมัติเมื่อเริ่มเกม</span>
            </div>
          </div>
        )}

        {state.phase === "question" && (
          <PlayerQuestion
            state={state}
            sessionId={id}
            onRefresh={refresh}
          />
        )}

        {state.phase === "reveal" && (
          <PlayerReveal state={state} />
        )}

        {state.phase === "leaderboard" && (
          <PlayerLeaderboard state={state} />
        )}

        {state.phase === "ended" && (
          <div className="w-full flex-1 flex flex-col justify-between space-y-4">
            {state.team_mode && Array.isArray(state.teamBoard) && state.teamBoard.length > 0 && (
              <div className="card max-w-md mx-auto w-full border border-border rounded-[20px] p-4 shadow-xs">
                <div className="text-xs font-bold text-foreground mb-2.5 flex items-center justify-between">
                  <span>ตารางคะแนนทีม</span>
                  <span className="text-[11px] font-normal text-muted-foreground">คะแนนเฉลี่ยสมาชิก</span>
                </div>
                <div className="space-y-2">
                  {state.teamBoard.map((team, idx) => {
                    const rank = team.rank ?? idx + 1;
                    const isMyTeam = activeTeam && (team.id === activeTeam.id || team.name === activeTeam.name);
                    const style = getTeamStyle(team.colorNo);
                    return (
                      <div
                        key={team.id || idx}
                        className={`flex items-center justify-between p-2.5 rounded-[12px] transition ${
                          isMyTeam
                            ? "bg-primary-soft/60 border border-primary/30"
                            : "bg-muted/50 border border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-card text-foreground border border-border text-xs font-bold flex items-center justify-center shrink-0">
                            {rank}
                          </span>
                          <span className={`w-3 h-3 rounded-full shrink-0 ${style.bg}`} />
                          <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                            ทีม{team.name}
                          </span>
                          {isMyTeam && (
                            <span className="text-[10px] text-primary font-medium shrink-0">
                              (ทีมคุณ)
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-primary font-bold tabular-nums text-xs sm:text-sm shrink-0">
                          {(team.score || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">คะแนน</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <PlayerEnded state={state} />
          </div>
        )}
      </main>
    </div>,
    document.body
  );
}
