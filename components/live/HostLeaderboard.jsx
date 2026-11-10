"use client";

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

export function HostLeaderboard({ state, onAdvance, advancing }) {
  const { top5 = [], index, total } = state;
  const isLast = index + 1 >= total;

  const rankMedal = (rank) => {
    switch (rank) {
      case 1:
        return { label: "1", bg: "bg-amber-400 text-amber-950 ring-2 ring-amber-300 border border-amber-500/40", text: "text-amber-800" };
      case 2:
        return { label: "2", bg: "bg-slate-200 text-slate-800 ring-2 ring-slate-200 border border-slate-300", text: "text-slate-700" };
      case 3:
        return { label: "3", bg: "bg-[#9a4a2b] text-white ring-2 ring-[#9a4a2b]/30 border border-[#833d22]", text: "text-[#8a3e22]" };
      default:
        return { label: String(rank), bg: "bg-[var(--muted)] text-[var(--fg)] border border-[var(--border)]", text: "text-[var(--muted-fg)]" };
    }
  };

  return (
    <div className={`flex-1 flex flex-col justify-between ${state.team_mode ? "max-w-6xl" : "max-w-4xl"} mx-auto w-full py-4 sm:py-6`}>
      <div className="text-center space-y-2">
        <span className="badge badge-muted px-4 py-1.5 h-auto text-sm font-semibold">
          จบข้อที่ {index + 1} จาก {total}
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-[var(--fg)] tracking-wide">
          ตารางผู้นำ (Leaderboard)
        </h2>
      </div>

      {/* Top 5 and Team Table beside each other in team mode */}
      {state.team_mode && state.teamBoard ? (
        <div className="my-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Top 5 list */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[var(--fg)] mb-2 flex items-center justify-between">
              <span>คะแนนเดี่ยว (Top 5)</span>
            </h3>
            {top5.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-fg)]">ยังไม่มีข้อมูลคะแนน</div>
            ) : (
              top5.map((player, idx) => {
                const rank = player.rank;
                const medal = rankMedal(rank);
                return (
                  <div
                    key={player.userId || idx}
                    className="card flex items-center justify-between p-3.5 sm:p-4 rounded-[18px] border border-[var(--border)] shadow-xs"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-base shrink-0 ${medal.bg}`}
                      >
                        {medal.label}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-[var(--fg)] truncate">
                        {player.name}
                      </div>
                    </div>

                    <div className="text-lg sm:text-xl font-black font-mono text-[var(--primary)] tabular-nums shrink-0">
                      {(player.score || 0).toLocaleString()} <span className="text-xs font-normal text-[var(--muted-fg)]">คะแนน</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Team Standings Table beside Top 5 */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[var(--fg)] mb-2 flex items-center justify-between">
              <span>ตารางคะแนนทีม</span>
              <span className="text-xs font-normal text-[var(--muted-fg)]">คะแนนเฉลี่ย</span>
            </h3>
            {state.teamBoard.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-fg)]">ยังไม่มีข้อมูลทีม</div>
            ) : (
              state.teamBoard.map((team, idx) => {
                const rank = team.rank;
                const style = getTeamStyle(team.colorNo);
                return (
                  <div
                    key={team.id || idx}
                    className="card flex items-center justify-between p-3.5 sm:p-4 rounded-[18px] border border-[var(--border)] shadow-xs"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-base shrink-0 bg-[var(--muted)] text-[var(--fg)] border border-[var(--border)]">
                        {rank}
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-3.5 h-3.5 rounded-full ${style.bg} shrink-0`} />
                        <span className="text-base sm:text-lg font-bold text-[var(--fg)] truncate">
                          ทีม{team.name}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--muted-fg)] shrink-0">({team.members} คน)</span>
                    </div>

                    <div className="text-lg sm:text-xl font-black font-mono text-[var(--primary)] tabular-nums shrink-0">
                      {(team.score || 0).toLocaleString()} <span className="text-xs font-normal text-[var(--muted-fg)]">คะแนน</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Top 5 list (individual mode) */
        <div className="my-6 space-y-3">
          {top5.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-fg)]">ยังไม่มีข้อมูลคะแนน</div>
          ) : (
            top5.map((player, idx) => {
              const rank = player.rank;
              const medal = rankMedal(rank);
              return (
                <div
                  key={player.userId || idx}
                  className="card flex items-center justify-between p-4 sm:p-5 rounded-[20px] border border-[var(--border)] shadow-xs transition-all"
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${medal.bg}`}
                    >
                      {medal.label}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[var(--fg)] truncate">
                      {player.name}
                    </div>
                  </div>

                  <div className="text-xl sm:text-3xl font-black font-mono text-[var(--primary)] tabular-nums shrink-0">
                    {(player.score || 0).toLocaleString()} <span className="text-sm sm:text-base font-normal text-[var(--muted-fg)]">คะแนน</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        {isLast ? (
          <button
            onClick={() => onAdvance("finish")}
            disabled={advancing}
            className="btn btn-primary h-auto px-8 py-3.5 rounded-full font-bold text-lg sm:text-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>ดูผลรวม</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => onAdvance("next")}
            disabled={advancing}
            className="btn btn-primary h-auto px-8 py-3.5 rounded-full font-bold text-lg sm:text-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>ข้อถัดไป</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
