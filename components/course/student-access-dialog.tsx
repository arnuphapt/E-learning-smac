"use client"

import { useState } from "react"
import { CheckIcon, Loader2Icon, SearchIcon, UsersIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const [filterMode, setFilterMode] = useState<"all" | "selected">("all")
  const [tempEmails, setTempEmails] = useState<string[]>(allowedEmails)
  const [saving, setSaving] = useState(false)

  const toggle = (email: string) => setTempEmails((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]))

  const q = search.trim().toLowerCase()
  const filtered = allStudents.filter((s) => {
    const email = s.email || ""
    if (filterMode === "selected" && !tempEmails.includes(email)) return false
    if (!q) return true
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.student_no || "").toLowerCase().includes(q) ||
      email.toLowerCase().includes(q)
    )
  })

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSave(tempEmails)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border/80 bg-card px-6 py-4 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <UsersIcon className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold tracking-tight">จัดการสิทธิ์นักศึกษาเพิ่มเติม</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                เลือกนักศึกษาที่ใช้อีเมลเก่าหรือต้องการให้เข้าเรียนรายวิชานี้เป็นกรณีพิเศษ (ข้ามเงื่อนไขชั้นปีและกลุ่มเรียน)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 grid gap-2.5 border-b border-border/70 bg-muted/25 px-6 py-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="student-access-search" className="text-xs font-medium text-muted-foreground">
              ค้นหานักศึกษา
            </Label>
            <div className="relative">
              <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="student-access-search"
                className="pr-9 pl-9"
                placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรืออีเมล..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="ล้างคำค้นหา"
                  onClick={() => setSearch("")}
                >
                  <XIcon className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant={filterMode === "all" ? "secondary" : "ghost"}
                onClick={() => setFilterMode("all")}
              >
                ทั้งหมด <span className="tabular-nums">({allStudents.length})</span>
              </Button>
              <Button
                type="button"
                size="xs"
                variant={filterMode === "selected" ? "secondary" : "ghost"}
                onClick={() => setFilterMode("selected")}
              >
                ที่เลือก <span className="tabular-nums">({tempEmails.length})</span>
              </Button>
            </div>
            {tempEmails.length > 0 && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setTempEmails([])}
              >
                ล้างที่เลือก
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-80 bg-card">
          <div className="grid gap-1.5 p-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                {filterMode === "selected" && tempEmails.length === 0
                  ? "ยังไม่ได้เลือกนักศึกษาเพิ่มเติม"
                  : "ไม่พบรายชื่อนักศึกษาที่ตรงกับคำค้นหา"}
              </div>
            ) : (
              filtered.map((s) => {
                const email = s.email || ""
                const checked = tempEmails.includes(email)
                const initial = (s.name?.trim()?.[0] || "น").toUpperCase()
                return (
                  <Label
                    key={s.id}
                    htmlFor={"access-" + s.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 font-normal transition-colors",
                      checked
                        ? "border-primary/45 bg-primary-soft/45"
                        : "border-transparent hover:border-border/70 hover:bg-muted/40",
                    )}
                  >
                    <Checkbox id={"access-" + s.id} checked={checked} onCheckedChange={() => toggle(email)} />
                    <div
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">{s.name}</span>
                        {s.student_no && <span className="font-mono text-xs text-muted-foreground tabular-nums">({s.student_no})</span>}
                        {allowedEmails.includes(email) && <Badge variant="secondary">บันทึกไว้แล้ว</Badge>}
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

        <DialogFooter className="shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/35 px-6 py-3.5 sm:justify-between">
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            เลือกแล้ว <strong className="text-foreground">{tempEmails.length}</strong> คน
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              บันทึกการแก้ไข
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
