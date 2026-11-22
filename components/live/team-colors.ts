/** Fixed team colours 1-8 (same palette on host lobby, leaderboard and podium). Tailwind palette, not theme tokens. */
export interface TeamColorStyle {
  name: string
  /** Dot / swatch background. */
  dot: string
  /** Card border. */
  border: string
  /** Soft count badge. */
  badge: string
}

const TEAM_COLORS: Record<number, TeamColorStyle> = {
  1: { name: "แดง", dot: "bg-red-500", border: "border-red-300", badge: "border-red-200 bg-red-50 text-red-700" },
  2: { name: "ฟ้า", dot: "bg-sky-500", border: "border-sky-300", badge: "border-sky-200 bg-sky-50 text-sky-700" },
  3: { name: "เหลือง", dot: "bg-amber-500", border: "border-amber-300", badge: "border-amber-200 bg-amber-50 text-amber-800" },
  4: { name: "เขียว", dot: "bg-emerald-500", border: "border-emerald-300", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  5: { name: "ม่วง", dot: "bg-purple-500", border: "border-purple-300", badge: "border-purple-200 bg-purple-50 text-purple-700" },
  6: { name: "ส้ม", dot: "bg-orange-500", border: "border-orange-300", badge: "border-orange-200 bg-orange-50 text-orange-800" },
  7: { name: "ชมพู", dot: "bg-pink-500", border: "border-pink-300", badge: "border-pink-200 bg-pink-50 text-pink-700" },
  8: { name: "เทา", dot: "bg-slate-500", border: "border-slate-300", badge: "border-slate-200 bg-slate-100 text-slate-700" },
}

const FALLBACK: TeamColorStyle = {
  name: "ทีม",
  dot: "bg-muted-foreground",
  border: "border-border",
  badge: "border-border bg-muted text-muted-foreground",
}

export function getTeamStyle(colorNo: number): TeamColorStyle {
  return TEAM_COLORS[colorNo] ?? FALLBACK
}
