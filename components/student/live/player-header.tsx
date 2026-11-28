import Link from "next/link";
import { ArrowLeftIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTeamStyle } from "@/components/live/team-colors";
import { cn } from "@/lib/utils";
import type { TeamInfo } from "./types";

/** Top bar of the live room: way out, quiz title, sound toggle, the player's team chip (with rank once revealed) and the live dot. */
export function PlayerHeader({
  title,
  muted,
  onToggleMute,
  team,
  rank,
}: {
  title: string;
  muted: boolean;
  onToggleMute: () => void;
  team: TeamInfo | null | undefined;
  /** Shown next to the team name once ranks are revealed. */
  rank: number | null;
}) {
  const style = team ? getTeamStyle(team.colorNo ?? 0) : null;
  return (
    <header className="db-panel relative z-10 flex items-center justify-between gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href="/s/live/quiz"
          aria-label="ออก"
          className="db-btn db-btn--default db-btn--compact shrink-0"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">ออก</span>
        </Link>
        <span className="min-w-0 truncate text-sm font-bold text-[var(--text)]">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant={muted ? "outline" : "secondary"}
          size="sm"
          className="db-btn db-btn--default db-btn--compact"
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
        >
          {muted ? <VolumeXIcon className="size-4" aria-hidden /> : <Volume2Icon className="size-4" aria-hidden />}
          <span className="sr-only sm:not-sr-only">{muted ? "เปิดเสียง" : "ปิดเสียง"}</span>
        </Button>

        {team && style && (
          <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5", style.badge)}>
            <span className={cn("size-2 rounded-full", style.dot)} />
            ทีม{team.name}
            {rank != null && <span className="text-[10px] font-bold tabular-nums">อันดับ {rank}</span>}
          </Badge>
        )}
        <span className="size-2 animate-pulse rounded-full bg-[var(--accept)]" />
        <span className="text-xs font-semibold text-[var(--text-muted)]">สด</span>
      </div>
    </header>
  );
}
