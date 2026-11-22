/** Rank chip colours for leaderboard rows (gold / silver / bronze, then neutral). */
export function rankMedalClass(rank?: number | null): string {
  switch (rank) {
    case 1:
      return "border-amber-500/40 bg-amber-400 text-amber-950"
    case 2:
      return "border-slate-300 bg-slate-200 text-slate-800"
    case 3:
      return "border-orange-800 bg-orange-700 text-white"
    default:
      return "border-border bg-muted text-foreground"
  }
}
