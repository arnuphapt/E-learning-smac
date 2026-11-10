"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLiveSession } from "@/lib/hooks";
import { HostQuestion } from "@/components/live/HostQuestion";
import { HostReveal } from "@/components/live/HostReveal";
import { HostLeaderboard } from "@/components/live/HostLeaderboard";
import { HostEnded } from "@/components/live/HostEnded";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Primitives";
import * as sound from "@/lib/live-sound";
import { bg, assetExists } from "@/lib/live-assets";


export default function HostLiveSessionPage() {
  const params = useParams();
  const id = params?.id;

  const { state, error, refresh } = useLiveSession(id, { isHost: true });
  const [siteUrl, setSiteUrl] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [movingPlayerId, setMovingPlayerId] = useState(null);
  const [muted, setMuted] = useState(false);
  const [bgUrl, setBgUrl] = useState(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const lastPhaseKeyRef = useRef(null);
  const prevPlayerCountRef = useRef(null);

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

  const TEAM_COLORS = {
    1: { name: "แดง", bg: "bg-red-500", text: "text-red-600", border: "border-red-300", badge: "bg-red-50 text-red-700 border-red-200" },
    2: { name: "ฟ้า", bg: "bg-sky-500", text: "text-sky-600", border: "border-sky-300", badge: "bg-sky-50 text-sky-700 border-sky-200" },
    3: { name: "เหลือง", bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-300", badge: "bg-amber-50 text-amber-800 border-amber-200" },
    4: { name: "เขียว", bg: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-300", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    5: { name: "ม่วง", bg: "bg-purple-500", text: "text-purple-600", border: "border-purple-300", badge: "bg-purple-50 text-purple-700 border-purple-200" },
    6: { name: "ส้ม", bg: "bg-orange-500", text: "text-orange-600", border: "border-orange-300", badge: "bg-orange-50 text-orange-800 border-orange-200" },
    7: { name: "ชมพู", bg: "bg-pink-500", text: "text-pink-600", border: "border-pink-300", badge: "bg-pink-50 text-pink-700 border-pink-200" },
    8: { name: "เทา", bg: "bg-slate-500", text: "text-slate-600", border: "border-slate-300", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  };

  function getTeamStyle(colorNo) {
    return (
      TEAM_COLORS[colorNo] || {
        name: "ทีม",
        bg: "bg-slate-500",
        text: "text-slate-600",
        border: "border-slate-300",
        badge: "bg-slate-100 text-slate-700 border-slate-200",
      }
    );
  }

  const handleMoveTeam = useCallback(
    async (userId, targetTeamId) => {
      if (!id || !userId || !targetTeamId || movingPlayerId) return;
      try {
        setMovingPlayerId(userId);
        const res = await fetch(`/api/live/${id}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, team_id: targetTeamId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("Move team error:", errData.error || res.statusText);
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteUrl(`${window.location.origin}/s/live`);
    }
  }, []);

  const handleAdvance = useCallback(
    async (action) => {
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
          const errData = await res.json().catch(() => ({}));
          console.warn("Advance warning:", errData.error || res.statusText);
        }
        await refresh();
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

  const handleEndGame = () => {
    setConfirmEndOpen(true);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-6 text-[#0f172a]">
        <div className="max-w-md w-full bg-white rounded-[20px] p-8 shadow-sm border border-red-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-800">เกิดข้อผิดพลาดในการโหลดห้อง</h1>
          <p className="text-sm text-slate-500">{error.message || "ไม่สามารถเชื่อมต่อห้องควิซได้"}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => refresh()}
              className="px-4 py-2 rounded-[12px] bg-[#0d6e8c] text-white text-sm font-semibold hover:bg-[#0a5063] transition"
            >
              ลองใหม่อีกครั้ง
            </button>
            <Link
              href="/i/live"
              className="px-4 py-2 rounded-[12px] bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
            >
              กลับหน้ารายการห้อง
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-[var(--muted-fg)]">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">กำลังเชื่อมต่อห้องควิซสด...</p>
      </div>
    );
  }

  const players = Array.isArray(state.players) ? state.players : [];
  const playerCount = players.length;
  const teams = Array.isArray(state.teams) ? state.teams : [];

  const teamsWithMembers = teams.map((t) => ({
    ...t,
    members: t.players || [],
  }));

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--fg)] flex flex-col justify-between p-4 sm:p-8 select-none font-sans overflow-y-auto overflow-x-hidden">
      {/* Dynamic Background Image with Light Contrast Overlay or Solid House Background */}
      {bgUrl ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${bgUrl})` }}
        >
          {/* Light overlay guaranteeing text contrast >= 4.5:1 */}
          <div className="absolute inset-0 bg-[#f1f5f9]/88 backdrop-blur-[1px]" />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 bg-[var(--bg)]"
        />
      )}

      {/* Top Bar for Projector */}
      <header className="relative z-10 flex items-center justify-between border-b border-[var(--border)] pb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/i/live"
            className="btn btn-outline btn-sm text-sm font-semibold shrink-0"
          >
            ← หน้ารายการห้อง
          </Link>
          <span className="text-base sm:text-lg font-bold text-[var(--fg)] truncate max-w-sm sm:max-w-md">
            {state.title}
          </span>
          {state.phase !== "lobby" && (
            <span className="card px-3 py-1 rounded-full text-sm font-semibold border border-[var(--border)] text-[var(--muted-fg)] shadow-xs">
              ข้อ {state.current_index + 1}/{state.total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Mute Toggle Button (aria-pressed, keyboard operable) */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-pressed={muted}
            aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
            className="btn btn-outline btn-sm flex items-center gap-2 px-3.5 py-2 rounded-full text-sm sm:text-base font-semibold cursor-pointer"
            title={muted ? "เปิดเสียง" : "ปิดเสียง"}
          >
            {muted ? (
              <>
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <span>ปิดเสียงอยู่</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>เปิดเสียง</span>
              </>
            )}
          </button>

          {state.phase !== "ended" && (
            <button
              onClick={handleEndGame}
              disabled={advancing}
              className="btn btn-danger btn-sm text-sm sm:text-base font-semibold cursor-pointer"
              title="จบการแข่งขันทันที"
            >
              จบเกม
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 card bg-white px-3.5 py-1.5 rounded-full border border-[var(--border)] shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm sm:text-base font-bold text-[var(--fg)] font-mono">PIN: {state.pin}</span>
          </div>
        </div>
      </header>

      {/* Main Phase Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center my-2 sm:my-4">
        {state.phase === "lobby" && (
          <div className="my-auto py-6 text-center max-w-4xl mx-auto w-full">
            {/* Join Instruction */}
            <div className="card inline-block border border-[var(--border)] px-6 py-3 rounded-full mb-6 shadow-sm">
              <p className="text-base sm:text-xl text-[var(--fg)] font-medium">
                เข้า <span className="text-[var(--primary)] font-bold underline underline-offset-4">{siteUrl || "/s/live"}</span> แล้วกรอก PIN
              </p>
            </div>

            {/* Large PIN Billboard */}
            <div className="card border-2 border-[var(--primary)]/30 rounded-[28px] p-6 sm:p-10 shadow-sm max-w-2xl mx-auto">
              <div className="text-sm sm:text-base font-bold text-[var(--primary)] uppercase tracking-widest mb-2">
                GAME PIN
              </div>
              <div className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-widest text-[var(--fg)] py-2">
                {state.pin || "------"}
              </div>
              <div className="text-sm text-[var(--muted-fg)] mt-2">
                จำนวน {state.total} ข้อ · ระบบคำถามแสดงพร้อมกันเมื่อเริ่มเกม
              </div>
            </div>

            {/* Player Count & Start Action */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="card flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] shadow-xs">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-base font-bold text-[var(--fg)]">{playerCount}</span>
                <span className="text-sm sm:text-base text-[var(--muted-fg)]">คนเข้าร่วมแล้ว</span>
              </div>

              <button
                onClick={() => handleAdvance("start")}
                disabled={playerCount === 0 || advancing}
                className="btn btn-primary px-8 py-3 rounded-full font-bold text-base sm:text-lg shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={playerCount === 0 ? "รอนักศึกษาเข้าร่วมก่อนเริ่ม" : "เริ่มเล่นควิซ"}
              >
                เริ่มเกม ({playerCount})
              </button>
            </div>

            {/* Players Live Grid */}
            <div className="card mt-8 max-w-6xl mx-auto w-full rounded-[20px] p-6 shadow-sm border border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm sm:text-base font-bold text-[var(--fg)] flex items-center gap-2">
                  <span>รายชื่อผู้เล่นในห้อง ({playerCount})</span>
                  {state.team_mode && (
                    <span className="badge badge-info text-xs font-semibold">
                      โหมดทีม ({teams.length} ทีม)
                    </span>
                  )}
                </div>
                {playerCount > 0 && (
                  <span className="text-xs sm:text-sm text-[var(--muted-fg)]">อัปเดตแบบเรียลไทม์</span>
                )}
              </div>

              {playerCount === 0 ? (
                <div className="py-8 text-center text-[var(--muted-fg)] text-sm sm:text-base">
                  กำลังรอนักศึกษาเข้าห้อง...
                </div>
              ) : state.team_mode ? (
                /* One column per team */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {teamsWithMembers.map((team) => {
                    const style = getTeamStyle(team.colorNo);
                    return (
                      <div
                        key={team.id}
                        className={`card rounded-[16px] border ${style.border} p-4 flex flex-col justify-between shadow-xs`}
                      >
                        {/* Team Column Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full ${style.bg} shrink-0`} />
                            <span className="text-sm sm:text-base font-bold text-[var(--fg)]">
                              ทีม{team.name}
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge}`}>
                            {team.members.length} คน
                          </span>
                        </div>

                        {/* Players inside this team */}
                        <div className="space-y-2 flex-1 min-h-[60px] max-h-64 overflow-y-auto pr-1">
                          {team.members.length === 0 ? (
                            <div className="text-center py-4 text-xs text-[var(--muted-fg)] italic">
                              ยังไม่มีสมาชิก
                            </div>
                          ) : (
                            team.members.map((member, mIdx) => (
                              <div
                                key={member.userId || `${team.id}_${mIdx}`}
                                className="p-2.5 rounded-[10px] bg-[var(--muted)] border border-[var(--border)] flex items-center justify-between gap-2"
                              >
                                <span className="text-xs sm:text-sm font-medium text-[var(--fg)] truncate" title={member.name}>
                                  {member.name}
                                </span>

                                {/* Select to move to another team */}
                                {member.userId ? (
                                  <Select
                                    value={team.id}
                                    disabled={movingPlayerId === member.userId}
                                    onChange={(e) => handleMoveTeam(member.userId, e.target.value)}
                                    className="input shrink-0"
                                    style={{ minWidth: 140 }}
                                    aria-label={`ย้ายทีมสำหรับ ${member.name}`}
                                  >
                                    {teams.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        ย้ายไป: ทีม{t.name}
                                      </option>
                                    ))}
                                  </Select>
                                ) : (
                                  <span className="text-xs text-[var(--muted-fg)]">ทีม{team.name}</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Individual Mode Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-56 overflow-y-auto pr-1">
                  {players.map((p) => (
                    <div
                      key={p.userId}
                      className="px-3 py-2 rounded-[12px] bg-white border border-[var(--border)] text-center truncate shadow-xs transition hover:border-[var(--primary)]"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-[var(--fg)] truncate block">
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {state.phase === "question" && (
          <HostQuestion state={state} onAdvance={handleAdvance} />
        )}

        {state.phase === "reveal" && (
          <HostReveal state={state} onAdvance={handleAdvance} advancing={advancing} />
        )}

        {state.phase === "leaderboard" && (
          <HostLeaderboard state={state} onAdvance={handleAdvance} advancing={advancing} />
        )}

        {state.phase === "ended" && (
          <HostEnded state={state} />
        )}
      </div>

      {confirmEndOpen && (
        <ConfirmDialog
          open={confirmEndOpen}
          danger
          title="จบการแข่งขัน"
          message="ต้องการจบเกมทันทีหรือไม่?"
          confirmText="จบเกม"
          cancelText="ยกเลิก"
          onClose={() => setConfirmEndOpen(false)}
          onConfirm={() => {
            setConfirmEndOpen(false);
            handleAdvance("end");
          }}
        />
      )}
    </div>
  );
}
