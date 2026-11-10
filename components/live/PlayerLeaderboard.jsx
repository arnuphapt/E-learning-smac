"use client";

export function PlayerLeaderboard({ state }) {
  const { me = {}, top5 = [], index, total, playerCount } = state;
  const isLast = index + 1 >= total;

  return (
    <div className="flex-1 flex flex-col justify-between w-full h-full max-w-lg mx-auto py-2 sm:py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between px-2 pb-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">
          ตารางคะแนน (ข้อ {index + 1}/{total})
        </span>
        <span className="text-xs text-muted-foreground">
          {playerCount} ผู้เข้าแข่งขัน
        </span>
      </div>

      {/* Own Rank Banner */}
      <div className="my-3 p-4 rounded-2xl bg-primary-soft/40 border border-primary/20 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs text-primary font-semibold block">อันดับของคุณ</span>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {me.rank ? `ที่ ${me.rank}` : "—"}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              จาก {playerCount || "—"} คน
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground block">คะแนนสะสม</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-primary tabular-nums">
            {(me.totalScore || 0).toLocaleString()} <span className="text-xs text-muted-foreground">คะแนน</span>
          </span>
        </div>
      </div>

      {/* Top 5 list */}
      <div className="flex-1 my-2 overflow-y-auto space-y-2.5">
        <div className="text-xs font-semibold text-muted-foreground px-1 mb-1">
          ผู้นำ 5 อันดับแรก (Top 5)
        </div>

        {top5.map((p, idx) => {
          const rank = p.rank;
          const isMe = p.userId === me.userId;
          return (
            <div
              key={p.userId || idx}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                isMe
                  ? "bg-primary-soft/60 border-primary/40 ring-2 ring-primary/20"
                  : "card border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    rank === 1
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : rank === 2
                      ? "bg-slate-200 text-slate-700 border border-slate-300"
                      : rank === 3
                      ? "bg-amber-50 text-amber-900 border border-amber-200"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {rank}
                </div>
                <div className="min-w-0">
                  <span className="text-sm sm:text-base font-bold text-foreground truncate block">
                    {p.name} {isMe && <span className="text-xs text-primary font-normal">(คุณ)</span>}
                  </span>
                </div>
              </div>

              <div className="text-sm sm:text-base font-mono font-bold text-primary tabular-nums shrink-0 ml-2">
                {(p.score || 0).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center py-2 border-t border-border">
        <p className="text-xs text-muted-foreground animate-pulse">
          {isLast ? "รอผู้สอนสรุปผลการแข่งขัน…" : "รอผู้สอนเปิดข้อถัดไป…"}
        </p>
      </div>
    </div>
  );
}
