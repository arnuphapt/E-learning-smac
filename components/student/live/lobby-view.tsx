import { Gamepad2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTeamStyle } from "@/components/live/team-colors";
import { cn } from "@/lib/utils";
import type { TeamInfo } from "./types";

/** Waiting room: joined confirmation, the player's team and how many are in. */
export function LobbyView({ team, playerCount }: { team: TeamInfo | null | undefined; playerCount: number }) {
  const style = team ? getTeamStyle(team.colorNo ?? 0) : null;
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 py-6 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full border-2 border-primary/30 bg-primary-soft text-primary shadow-sm">
        <Gamepad2Icon className="size-9" />
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-black">คุณเข้าสู่ห้องแล้ว!</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">รอผู้สอนกดเริ่มเกมบนหน้าจอโปรเจกเตอร์</p>
      </div>

      {team && style && (
        <Card className={cn("text-left", style.border)}>
          <CardContent>
            <div className="mb-1 text-[11px] font-semibold text-muted-foreground">ทีมที่คุณสังกัด</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("grid size-10 place-items-center rounded-full text-base font-bold text-white shadow-xs", style.dot)}>
                  {team.name?.[0] || "T"}
                </div>
                <div>
                  <div className="text-lg font-bold">ทีม{team.name}</div>
                  <div className="text-xs text-muted-foreground">สี{team.name}</div>
                </div>
              </div>
              <Badge variant="outline" className={cn("px-3 py-1 font-bold", style.badge)}>ทีม{team.name}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <span className="mb-1 block text-xs text-muted-foreground">จำนวนผู้เข้าร่วมในห้อง</span>
          <div className="font-mono text-3xl font-black text-primary tabular-nums">
            {playerCount} <span className="text-sm font-normal text-muted-foreground">คน</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex animate-pulse items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary" />
        <span>ระบบจะเปลี่ยนหน้าจออัตโนมัติเมื่อเริ่มเกม</span>
      </div>
    </div>
  );
}
