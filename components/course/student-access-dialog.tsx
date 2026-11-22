"use client"

import { useState } from "react"
import { SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { StudentRow } from "./detail"

/** Pick students who may enter the course regardless of year/section (stored as `access.allowedEmails`). Mount only while open. */
export function StudentAccessDialog({
  allStudents,
  allowedEmails,
  onClose,
  onSave,
}: {
  allStudents: StudentRow[]
  allowedEmails: string[]
  onClose: () => void
  onSave: (emails: string[]) => Promise<void>
}) {
  const [search, setSearch] = useState("")
  const [tempEmails, setTempEmails] = useState<string[]>(allowedEmails)

  const toggle = (email: string) => setTempEmails((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]))

  const q = search.toLowerCase()
  const filtered = allStudents.filter(
    (s) => !q || (s.name || "").toLowerCase().includes(q) || (s.student_no || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q),
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>จัดการสิทธิ์นักศึกษาเพิ่มเติม</DialogTitle>
          <DialogDescription>เลือกนักศึกษาที่ใช้อีเมลเก่าหรือต้องการให้เข้าเรียนรายวิชานี้เป็นกรณีพิเศษ ( bypass ชั้นปีและกลุ่มเรียน )</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="student-access-search">ค้นหานักศึกษา</Label>
          <div className="relative">
            <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="student-access-search" className="pl-9" placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรืออีเมล..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <ScrollArea className="h-80 rounded-lg border">
          <div className="grid gap-1 p-2">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">ไม่พบรายชื่อนักศึกษา</div>
            ) : (
              filtered.map((s) => {
                const email = s.email || ""
                const checked = tempEmails.includes(email)
                return (
                  <Label key={s.id} htmlFor={"access-" + s.id} className="cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 font-normal hover:bg-muted has-data-[state=checked]:bg-primary-soft">
                    <Checkbox id={"access-" + s.id} className="mt-0.5" checked={checked} onCheckedChange={() => toggle(email)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold">{s.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">({s.student_no})</span>
                        {allowedEmails.includes(email) && <Badge variant="secondary">เพิ่มด้วยมือ</Badge>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.email} {s.section ? `· Sec ${s.section}` : ""}
                      </div>
                    </div>
                  </Label>
                )
              })
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">เลือกแล้ว {tempEmails.length} คน</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await onSave(tempEmails)
                onClose()
              }}
            >
              บันทึกการแก้ไข
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
