"use client";

import { useState } from "react";
import { PencilIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function TeamNameEditor({
  team,
  onRename,
}: {
  team: LobbyTeam;
  onRename: (teamId: string, name: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(team.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const name = value.trim();
    if (!name || name.length > 30) {
      setError("ชื่อทีมต้องมีความยาว 1-30 ตัวอักษร");
      return;
    }
    setSaving(true);
    const err = await onRename(team.id, name);
    setSaving(false);
    if (err) setError(err);
    else setEditing(false);
  };

  if (!editing) {
    return (
      <>
        <span className="text-sm font-bold text-[var(--text)] sm:text-base">ทีม{team.name}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`แก้ชื่อทีม${team.name}`}
          className="text-[var(--text-muted)] hover:bg-[var(--surface-1)] hover:text-[var(--text)]"
          onClick={() => {
            setValue(team.name);
            setError(null);
            setEditing(true);
          }}
        >
          <PencilIcon aria-hidden />
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={value}
          disabled={saving}
          aria-label="ชื่อทีม"
          aria-invalid={!!error}
          className="h-8 w-28 border-[var(--frame-soft)] bg-[var(--surface-1)] text-[var(--text)]"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="sm" disabled={saving} onClick={save} className="db-btn db-btn--accept h-8 min-h-0 px-3 text-sm">
          บันทึก
        </Button>
      </div>
      {error && <span className="text-xs text-[var(--warn)]">{error}</span>}
    </div>
  );
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
  onRenameTeam,
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
  onRenameTeam: (teamId: string, name: string) => Promise<string | null>;
}) {
  const playerCount = players.length;

  return (
    <div className="mx-auto my-auto w-full max-w-4xl py-6 text-center">
      <Card className="db-panel mb-6 inline-flex px-6 py-3">
        <p className="text-base font-medium text-[var(--text-strong)] sm:text-xl">
          เข้า <span className="font-bold text-[var(--gold)] underline underline-offset-4">{siteUrl || "/s/live/quiz"}</span> แล้วกรอก PIN
        </p>
      </Card>

      <Card className="db-panel mx-auto max-w-2xl gap-0 p-6 sm:p-10">
        <div className="mb-2 text-sm font-bold tracking-widest text-[var(--text-subtle)] sm:text-base">GAME PIN</div>
        <div className="py-2 font-mono text-6xl font-black tracking-widest tabular-nums text-[var(--text)] sm:text-7xl md:text-8xl">
          {pin || "------"}
        </div>
        <div className="mt-2 text-sm text-[var(--text-muted)] sm:text-base">จำนวน {total} ข้อ · ระบบคำถามแสดงพร้อมกันเมื่อเริ่มเกม</div>
      </Card>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Badge variant="outline" className="db-chip px-5 py-2.5 text-sm sm:text-base">
          <UsersIcon className="text-[var(--accept)]" aria-hidden />
          <span className="font-bold text-[var(--text)]">{playerCount}</span>
          <span className="text-[var(--text-muted)]">คนเข้าร่วมแล้ว</span>
        </Badge>

        <Button
          size="lg"
          className="db-btn db-btn--accept h-auto px-8 py-3 text-[19px] font-bold sm:text-xl"
          onClick={onStart}
          disabled={playerCount === 0 || advancing}
          title={playerCount === 0 ? "รอนักศึกษาเข้าร่วมก่อนเริ่ม" : "เริ่มเล่นควิซ"}
        >
          เริ่มเกม ({playerCount})
        </Button>
      </div>

      <Card className="db-panel mx-auto mt-8 w-full max-w-6xl gap-0 p-6 text-left">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)] sm:text-base">
            <span>รายชื่อผู้เล่นในห้อง ({playerCount})</span>
            {teamMode && (
              <Badge variant="secondary" className="db-chip px-2.5 py-0.5 text-xs sm:text-sm">
                โหมดทีม ({teams.length} ทีม)
              </Badge>
            )}
          </div>
          {playerCount > 0 && <span className="text-xs text-[var(--text-muted)] sm:text-sm">อัปเดตแบบเรียลไทม์</span>}
        </div>

        {playerCount === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-muted)] sm:text-base">กำลังรอนักศึกษาเข้าห้อง...</div>
        ) : teamMode ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {teams.map((team) => {
              const style = getTeamStyle(team.colorNo);
              const members = team.players || [];
              return (
                <Card key={team.id} className={cn("db-well justify-between gap-0 p-4", style.border)}>
                  <div className="mb-3 flex items-center justify-between border-b border-[var(--frame-soft)] pb-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className={cn("size-3.5 shrink-0 rounded-full", style.dot)} />
                      <TeamNameEditor team={team} onRename={onRenameTeam} />
                    </div>
                    <Badge variant="outline" className={style.badge}>
                      {members.length} คน
                    </Badge>
                  </div>

                  <div className="flex max-h-64 min-h-16 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                    {members.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[var(--text-muted)] italic">ยังไม่มีสมาชิก</div>
                    ) : (
                      members.map((member, mIdx) => (
                        <div
                          key={member.userId || `${team.id}_${mIdx}`}
                          className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--frame-soft)] bg-[var(--surface-1)] p-2.5"
                        >
                          <span className="truncate text-xs font-medium text-[var(--text)] sm:text-sm" title={member.name}>
                            {member.name}
                          </span>

                          {member.userId ? (
                            <Select
                              value={team.id}
                              disabled={movingPlayerId === member.userId}
                              onValueChange={(teamId) => onMoveTeam(member.userId!, teamId)}
                            >
                              <SelectTrigger
                                size="sm"
                                className="min-w-36 shrink-0 border-[var(--frame-soft)] bg-[var(--surface-0)] text-[var(--text)]"
                                aria-label={`ย้ายทีมสำหรับ ${member.name}`}
                              >
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
                            <span className="text-xs text-[var(--text-muted)]">ทีม{team.name}</span>
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
                className="db-well truncate px-3 py-2 text-center transition-colors hover:border-[var(--frame)]"
              >
                <span className="block truncate text-xs font-semibold text-[var(--text)] sm:text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
