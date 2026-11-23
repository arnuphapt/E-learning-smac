import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTeamStyle } from "@/components/live/team-colors";
import { cn } from "@/lib/utils";
import type { TeamInfo } from "./types";

/** Reveal / leaderboard / ended: the player's team, its score and standing. */
export function TeamRankBanner({ team, standing, rank }: { team: TeamInfo; standing: TeamInfo | null | undefined; rank: number | null }) {
  const style = getTeamStyle(team.colorNo ?? 0);
  return (
    <Card className={cn("mx-auto mb-3 w-full max-w-md flex-row items-center justify-between gap-2 px-3 py-3", style.border)}>
      <div className="flex items-center gap-2.5">
        <span className={cn("size-3.5 shrink-0 rounded-full", style.dot)} />
        <span className="text-sm font-bold">ทีม{team.name}</span>
      </div>
      <div className="flex items-center gap-2">
        {standing && typeof standing.score === "number" && (
          <span className="mr-1 font-mono text-xs font-bold text-primary">{standing.score.toLocaleString()} คะแนน</span>
        )}
        <span className="text-xs text-muted-foreground">อันดับทีม:</span>
        <Badge variant="secondary" className="font-bold">{rank ? `อันดับ ${rank}` : "กำลังคำนวณ…"}</Badge>
      </div>
    </Card>
  );
}
