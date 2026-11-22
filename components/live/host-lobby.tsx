"use client";

import { UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getTeamStyle } from "./team-colors";

export interface LobbyPlayer {
  userId?: string;
  name: string;
  joinedAt?: string;
}

export interface LobbyTeam {
  id: string;
  name: string;
  colorNo: number;
  players?: LobbyPlayer[];
}

export function HostLobby({
  pin,
  total,
  teamMode,
  players,
  teams,
  siteUrl,
  advancing,
  movingPlayerId,
  onStart,
  onMoveTeam,
}: {
  pin?: string | null;
  total: number;
  teamMode: boolean;
  players: LobbyPlayer[];
  teams: LobbyTeam[];
  siteUrl: string;
  advancing: boolean;
  movingPlayerId: string | null;
  onStart: () => void;
  onMoveTeam: (userId: string, teamId: string) => void;
}) {
  const playerCount = players.length;

  return (
    <div className="mx-auto my-auto w-full max-w-4xl py-6 text-center">
      <Card className="mb-6 inline-flex rounded-full px-6 py-3 shadow-sm">
        <p className="text-base font-medium text-foreground sm:text-xl">
          เข้า <span className="font-bold text-primary underline underline-offset-4">{siteUrl || "/s/live"}</span> แล้วกรอก PIN
        </p>
      </Card>

      <Card className="mx-auto max-w-2xl gap-0 border-2 border-primary/30 p-6 shadow-sm sm:p-10">
        <div className="mb-2 text-sm font-bold tracking-widest text-primary sm:text-base">GAME PIN</div>
        <div className="py-2 font-mono text-6xl font-black tracking-widest text-foreground sm:text-7xl md:text-8xl">
          {pin || "------"}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">จำนวน {total} ข้อ · ระบบคำถามแสดงพร้อมกันเมื่อเริ่มเกม</div>
      </Card>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Badge variant="outline" className="gap-2 bg-card px-5 py-2.5 text-sm sm:text-base">
          <UsersIcon className="text-success" aria-hidden />
          <span className="font-bold text-foreground">{playerCount}</span>
          <span className="text-muted-foreground">คนเข้าร่วมแล้ว</span>
        </Badge>

        <Button
          size="lg"
          className="h-auto rounded-full px-8 py-3 text-base font-bold shadow-md sm:text-lg"
          onClick={onStart}
          disabled={playerCount === 0 || advancing}
          title={playerCount === 0 ? "รอนักศึกษาเข้าร่วมก่อนเริ่ม" : "เริ่มเล่นควิซ"}
        >
          เริ่มเกม ({playerCount})
        </Button>
      </div>

      <Card className="mx-auto mt-8 w-full max-w-6xl gap-0 p-6 text-left shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground sm:text-base">
            <span>รายชื่อผู้เล่นในห้อง ({playerCount})</span>
            {teamMode && <Badge variant="secondary">โหมดทีม ({teams.length} ทีม)</Badge>}
          </div>
          {playerCount > 0 && <span className="text-xs text-muted-foreground sm:text-sm">อัปเดตแบบเรียลไทม์</span>}
        </div>

        {playerCount === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground sm:text-base">กำลังรอนักศึกษาเข้าห้อง...</div>
        ) : teamMode ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {teams.map((team) => {
              const style = getTeamStyle(team.colorNo);
              const members = team.players || [];
              return (
                <Card key={team.id} className={cn("justify-between gap-0 p-4 shadow-xs", style.border)}>
                  <div className="mb-3 flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className={cn("size-3.5 shrink-0 rounded-full", style.dot)} />
                      <span className="text-sm font-bold text-foreground sm:text-base">ทีม{team.name}</span>
                    </div>
                    <Badge variant="outline" className={style.badge}>
                      {members.length} คน
                    </Badge>
                  </div>

                  <div className="flex max-h-64 min-h-16 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                    {members.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground italic">ยังไม่มีสมาชิก</div>
                    ) : (
                      members.map((member, mIdx) => (
                        <div
                          key={member.userId || `${team.id}_${mIdx}`}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-muted p-2.5"
                        >
                          <span className="truncate text-xs font-medium text-foreground sm:text-sm" title={member.name}>
                            {member.name}
                          </span>

                          {member.userId ? (
                            <Select
                              value={team.id}
                              disabled={movingPlayerId === member.userId}
                              onValueChange={(teamId) => onMoveTeam(member.userId!, teamId)}
                            >
                              <SelectTrigger size="sm" className="min-w-36 shrink-0 bg-card" aria-label={`ย้ายทีมสำหรับ ${member.name}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    ย้ายไป: ทีม{t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">ทีม{team.name}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid max-h-56 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {players.map((p) => (
              <div
                key={p.userId}
                className="truncate rounded-xl border bg-card px-3 py-2 text-center shadow-xs transition-colors hover:border-primary"
              >
                <span className="block truncate text-xs font-semibold text-foreground sm:text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
