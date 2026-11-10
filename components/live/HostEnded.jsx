"use client";

import Link from "next/link";

const TEAM_COLORS = {
  1: { name: "แดง", bg: "bg-red-500", text: "text-red-700", border: "border-red-300" },
  2: { name: "ฟ้า", bg: "bg-sky-500", text: "text-sky-700", border: "border-sky-300" },
  3: { name: "เหลือง", bg: "bg-amber-500", text: "text-amber-800", border: "border-amber-300" },
  4: { name: "เขียว", bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-300" },
  5: { name: "ม่วง", bg: "bg-purple-500", text: "text-purple-700", border: "border-purple-300" },
  6: { name: "ส้ม", bg: "bg-orange-500", text: "text-orange-700", border: "border-orange-300" },
  7: { name: "ชมพู", bg: "bg-pink-500", text: "text-pink-700", border: "border-pink-300" },
  8: { name: "เทา", bg: "bg-slate-500", text: "text-slate-700", border: "border-slate-300" },
};

function getTeamStyle(colorNo) {
  return (
    TEAM_COLORS[colorNo] || {
      name: "ทีม",
      bg: "bg-[var(--muted-fg)]",
      text: "text-[var(--muted-fg)]",
      border: "border-[var(--border)]",
    }
  );
}

export function HostEnded({ state }) {
  const { top3 = [], top5 = [], total, playerCount } = state;

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full py-4 sm:py-8">
      <div className="text-center space-y-2">
        <span className="badge badge-success px-4 py-1.5 h-auto text-sm font-bold uppercase tracking-wider">
          จบการแข่งขันแล้ว
        </span>
        <h2 className="text-3xl sm:text-6xl font-black text-[var(--fg)] tracking-wide">
          แท่นรับรางวัล
        </h2>
        <p className="text-sm sm:text-base text-[var(--muted-fg)]">
          ควิซสด {total} ข้อ · ผู้เข้าแข่งขันทั้งหมด {playerCount} คน
        </p>
      </div>

      {/* Podium Visualization */}
      <div className="my-8 flex items-end justify-center gap-3 sm:gap-6 px-4 max-w-3xl mx-auto w-full">
        {/* 2nd Place */}
        {second && (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-center mb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-800 bg-slate-200 border border-slate-300 px-3 py-1 rounded-full shadow-xs">
                อันดับ 2
              </span>
              <div
                title={second.name}
                className="text-lg sm:text-2xl font-bold text-[var(--fg)] line-clamp-2 break-words max-w-[140px] sm:max-w-[180px] mt-1"
              >
                {second.name}
              </div>
              <div className="text-sm sm:text-lg font-mono font-bold text-slate-700 tabular-nums">
                {(second.score || 0).toLocaleString()} คะแนน
              </div>
            </div>
            <div className="w-full h-36 sm:h-48 rounded-t-[20px] bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 border-2 border-b-0 border-slate-300 flex items-center justify-center shadow-md">
              <span className="text-4xl sm:text-6xl font-black text-slate-800">{second.rank ?? 2}</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {first && (
          <div className="flex-1 flex flex-col items-center z-10">
            <div className="text-center mb-3">
              <span className="text-xs sm:text-sm font-bold text-amber-950 bg-amber-400 border border-amber-500/40 px-3 py-1 rounded-full shadow-xs">
                อันดับ 1
              </span>
              <div
                title={first.name}
                className="text-xl sm:text-3xl font-black text-[var(--fg)] line-clamp-2 break-words max-w-[160px] sm:max-w-[220px] mt-1"
              >
                {first.name}
              </div>
              <div className="text-base sm:text-2xl font-mono font-black text-amber-800 tabular-nums">
                {(first.score || 0).toLocaleString()} คะแนน
              </div>
            </div>
            <div className="w-full h-48 sm:h-64 rounded-t-[24px] bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 border-2 border-b-0 border-amber-400/80 flex items-center justify-center shadow-lg ring-4 ring-amber-400/20">
              <span className="text-5xl sm:text-8xl font-black text-amber-950">{first.rank ?? 1}</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-center mb-3">
              <span className="text-xs sm:text-sm font-bold text-white bg-[#9a4a2b] border border-[#833d22] px-3 py-1 rounded-full shadow-xs">
                อันดับ 3
              </span>
              <div
                title={third.name}
                className="text-lg sm:text-2xl font-bold text-[var(--fg)] line-clamp-2 break-words max-w-[140px] sm:max-w-[180px] mt-1"
              >
                {third.name}
              </div>
              <div className="text-sm sm:text-lg font-mono font-bold text-[#8a3e22] tabular-nums">
                {(third.score || 0).toLocaleString()} คะแนน
              </div>
            </div>
            <div className="w-full h-28 sm:h-36 rounded-t-[20px] bg-gradient-to-b from-[#f5dfd5] via-[#e8beab] to-[#d69f84] border-2 border-b-0 border-[#c4886b] flex items-center justify-center shadow-md">
              <span className="text-4xl sm:text-5xl font-black text-[#502213]">{third.rank ?? 3}</span>
            </div>
          </div>
        )}
      </div>

      {/* Team Table beside Top 5 or Other Top Players */}
      {state.team_mode && state.teamBoard ? (
        <div className="my-6 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start px-4">
          {/* Top 5 Individual */}
          <div className="card border border-[var(--border)] rounded-[20px] p-5 shadow-xs">
            <h3 className="text-lg font-bold text-[var(--fg)] mb-3 flex items-center justify-between">
              <span>คะแนนเดี่ยว (Top 5)</span>
            </h3>
            <div className="space-y-2.5">
              {top5.map((p, idx) => (
                <div
                  key={p.userId || idx}
                  className="flex items-center justify-between p-2.5 rounded-[12px] bg-[var(--muted)]/50 border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-white text-[var(--fg)] border border-[var(--border)] text-xs font-bold flex items-center justify-center shrink-0">
                      {p.rank ?? idx + 1}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-[var(--fg)] truncate">
                      {p.name}
                    </span>
                  </div>
                  <span className="font-mono text-[var(--primary)] font-bold tabular-nums text-sm shrink-0">
                    {(p.score || 0).toLocaleString()} <span className="text-xs font-normal text-[var(--muted-fg)]">คะแนน</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Standings Table with Winning Team Highlighted */}
          <div className="card border border-[var(--border)] rounded-[20px] p-5 shadow-xs">
            <h3 className="text-lg font-bold text-[var(--fg)] mb-3 flex items-center justify-between">
              <span>ตารางคะแนนทีม</span>
              <span className="text-xs text-[var(--muted-fg)]">คะแนนเฉลี่ยสมาชิก</span>
            </h3>
            <div className="space-y-2.5">
              {state.teamBoard.map((team, idx) => {
                const rank = team.rank ?? idx + 1;
                const isWinner = rank === 1;
                const style = getTeamStyle(team.colorNo);
                return (
                  <div
                    key={team.id || idx}
                    className={`flex items-center justify-between p-3 rounded-[14px] transition ${
                      isWinner
                        ? "bg-amber-50 border-2 border-amber-400 shadow-sm"
                        : "bg-[var(--muted)]/50 border border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          isWinner
                            ? "bg-amber-400 text-amber-950"
                            : "bg-white text-[var(--fg)] border border-[var(--border)]"
                        }`}
                      >
                        {rank}
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${style.bg}`} />
                        <span className={`text-sm sm:text-base font-bold truncate ${isWinner ? "text-amber-950" : "text-[var(--fg)]"}`}>
                          ทีม{team.name}
                        </span>
                        {isWinner && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 uppercase shrink-0 border border-amber-500/30">
                            👑 ทีมชนะเลิศ
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted-fg)] shrink-0">({team.members} คน)</span>
                    </div>

                    <div className={`font-mono font-bold text-sm sm:text-base tabular-nums shrink-0 ${
                      isWinner ? "text-amber-900 font-black" : "text-[var(--primary)]"
                    }`}>
                      {(team.score || 0).toLocaleString()} <span className="text-xs font-normal text-[var(--muted-fg)]">คะแนน</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Other Top Players if available */
        top5.length > 3 && (
          <div className="card max-w-xl mx-auto w-full border border-[var(--border)] rounded-[18px] p-4 mt-2 shadow-xs">
            <div className="text-xs font-semibold text-[var(--muted-fg)] mb-2">อันดับ 4 - 5</div>
            <div className="space-y-2">
              {top5.slice(3, 5).map((p, idx) => (
                <div key={p.userId || idx} className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-[var(--fg)] font-medium">
                    {p.rank ?? idx + 4}. {p.name}
                  </span>
                  <span className="font-mono text-[var(--primary)] font-bold tabular-nums">
                    {(p.score || 0).toLocaleString()} <span className="text-xs font-normal text-[var(--muted-fg)]">คะแนน</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Link
          href={`/i/live`}
          className="btn btn-outline h-auto px-6 py-3 rounded-full font-bold text-base transition"
        >
          กลับหน้ารายการห้อง
        </Link>
        <Link
          href={`/i/live/${state.id}/results`}
          className="btn btn-primary h-auto px-8 py-3 rounded-full font-bold text-base transition shadow-md"
        >
          ดูรายงานผลคะแนน
        </Link>
      </div>
    </div>
  );
}
