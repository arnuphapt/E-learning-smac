import { Card, CardContent } from "@/components/ui/card";
import { getTeamStyle } from "@/components/live/team-colors";
import { cn } from "@/lib/utils";
import type { TeamInfo } from "./types";

/** Final team standings (average of members); the player's own team is highlighted. */
export function TeamBoard({ teams, myTeam }: { teams: TeamInfo[]; myTeam: TeamInfo | null | undefined }) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent>
        <div className="mb-2.5 flex items-center justify-between text-xs font-bold">
          <span>ตารางคะแนนทีม</span>
          <span className="text-[11px] font-normal text-muted-foreground">คะแนนเฉลี่ยสมาชิก</span>
        </div>
        <div className="flex flex-col gap-2">
          {teams.map((team, idx) => {
            const rank = team.rank ?? idx + 1;
            const isMine = !!myTeam && (team.id === myTeam.id || team.name === myTeam.name);
            return (
              <div
                key={team.id || idx}
                className={cn("flex items-center justify-between rounded-xl border p-2.5", isMine ? "border-primary/30 bg-primary-soft/60" : "bg-muted/50")}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-card text-xs font-bold">{rank}</span>
                  <span className={cn("size-3 shrink-0 rounded-full", getTeamStyle(team.colorNo ?? 0).dot)} />
                  <span className="truncate text-xs font-bold sm:text-sm">ทีม{team.name}</span>
                  {isMine && <span className="shrink-0 text-[10px] font-medium text-primary">(ทีมคุณ)</span>}
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-primary tabular-nums sm:text-sm">
                  {(team.score || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">คะแนน</span>
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
