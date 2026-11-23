import Link from "next/link";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
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
    <header className="relative z-10 flex items-center justify-between gap-2 border-b pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/s/live" className="shrink-0 text-xs font-medium text-muted-foreground transition hover:text-foreground">
          ← ออก
        </Link>
        <span className="text-xs text-border">|</span>
        <span className="max-w-32 truncate text-xs font-semibold sm:max-w-xs sm:text-sm">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant={muted ? "outline" : "secondary"}
          size="sm"
          className="h-7 rounded-full px-2.5 text-xs"
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
        >
          {muted ? <VolumeXIcon /> : <Volume2Icon />}
          {muted ? "เปิดเสียง" : "ปิดเสียง"}
        </Button>

        {team && style && (
          <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5", style.badge)}>
            <span className={cn("size-2 rounded-full", style.dot)} />
            ทีม{team.name}
            {rank != null && <span className="text-[10px] font-bold">อันดับ {rank}</span>}
          </Badge>
        )}
        <span className="size-2 animate-pulse rounded-full bg-success" />
        <span className="text-xs font-medium text-muted-foreground">สด</span>
      </div>
    </header>
  );
}
