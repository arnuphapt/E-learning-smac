"use client"

import { useState } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { MultiSelect } from "@/components/common/multi-select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { InstructorOption } from "./detail"

/** "จัดการอาจารย์ผู้สอนร่วม": assigned co-instructors with remove, plus a picker to add more. Admins and course managers only. */
export function CoInstructorCard({
  assigned,
  available,
  currentUserId,
  onAdd,
  onRemove,
}: {
  assigned: InstructorOption[]
  available: InstructorOption[]
  currentUserId: string | undefined
  onAdd: (userIds: string[]) => void
  onRemove: (userId: string) => void
}) {
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])

  return (
    <Card>
      <CardHeader>
        <CardTitle>จัดการอาจารย์ผู้สอนร่วม (Instructors)</CardTitle>
        <CardDescription>มอบหมายสิทธิ์ให้อาจารย์ผู้สอนท่านอื่นในสาขาเดียวกัน เพื่อให้สามารถเข้ามาเพิ่มบทเรียน ตรวจงาน และจัดการวิชานี้ได้</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="text-xs font-bold text-muted-foreground">อาจารย์ที่ได้รับสิทธิ์ในวิชานี้:</div>
          {assigned.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">ยังไม่มีอาจารย์ผู้สอนร่วมในรายวิชานี้</div>
          ) : (
            assigned.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between rounded-lg border bg-muted p-2">
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{inst.name.replace(/^อ\. (ดร\. )?/, "").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-semibold">{inst.name}</div>
                    <div className="text-xs text-muted-foreground">{inst.email}</div>
                  </div>
                </div>
                {inst.id !== currentUserId && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`ถอดถอน ${inst.name}`} onClick={() => onRemove(inst.id)}>
                    <Trash2Icon />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {available.length > 0 ? (
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <MultiSelect
                id="add-co-instructors"
                options={available.map((u) => ({ value: u.id, label: u.name, description: u.email ?? undefined }))}
                selectedValues={selectedToAdd}
                onChange={setSelectedToAdd}
                placeholder="เลือกอาจารย์เพื่อเพิ่มเข้าสู่รายวิชา..."
                searchPlaceholder="ค้นหาคณาจารย์…"
                unit="คน"
              />
            </div>
            <Button
              disabled={selectedToAdd.length === 0}
              onClick={() => {
                onAdd(selectedToAdd)
                setSelectedToAdd([])
              }}
            >
              <PlusIcon />
              เพิ่มผู้สอน
            </Button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">ไม่มีอาจารย์ผู้สอนท่านอื่นที่ว่างในสาขาวิชานี้</div>
        )}
      </CardContent>
    </Card>
  )
}
