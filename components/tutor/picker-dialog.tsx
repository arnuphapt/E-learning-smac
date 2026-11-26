"use client"

import { useState } from "react"
import { CheckIcon, Loader2Icon, SearchIcon, UsersIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface PickerItem {
  id: string
  label: string
  sub?: string | null
}

interface PickerDialogProps {
  title?: string
  desc?: string
  items: readonly PickerItem[]
  selected: string[]
  onClose: () => void
  onSave: (selectedIds: string[]) => Promise<void> | void
}

// Searchable multi-pick used by the tutor workspace (students by email, instructors by id). Mounted only while open.
// items: [{ id, label, sub }]; selected: [id]; onSave(selectedIds) may be async.
export function PickerDialog({ title, desc, items, selected, onClose, onSave }: PickerDialogProps) {
  const [q, setQ] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "selected">("all")
  const [picked, setPicked] = useState<string[]>(selected)
  const [saving, setSaving] = useState(false)

  const needle = q.trim().toLowerCase()
  const shown = items.filter((it) => {
    if (filterMode === "selected" && !picked.includes(it.id)) return false
    if (!needle) return true
    return (it.label + " " + (it.sub || "")).toLowerCase().includes(needle)
  })
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSave(picked)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border/80 bg-card px-6 py-4 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <UsersIcon className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold tracking-tight">{title || "เลือกรายการ"}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">{desc ?? "เลือกรายการที่ต้องการ"}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 grid gap-2.5 border-b border-border/70 bg-muted/25 px-6 py-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="tutor-picker-search" className="text-xs font-medium text-muted-foreground">
              ค้นหารายการ
            </Label>
            <div className="relative">
              <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tutor-picker-search"
                className="pr-9 pl-9"
                placeholder="ค้นหา…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="ล้างคำค้นหา"
                  onClick={() => setQ("")}
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
                ทั้งหมด <span className="tabular-nums">({items.length})</span>
              </Button>
              <Button
                type="button"
                size="xs"
                variant={filterMode === "selected" ? "secondary" : "ghost"}
                onClick={() => setFilterMode("selected")}
              >
                ที่เลือก <span className="tabular-nums">({picked.length})</span>
              </Button>
            </div>
            {picked.length > 0 && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setPicked([])}
              >
                ล้างที่เลือก
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-80 bg-card">
          <div className="grid gap-1.5 p-3">
            {shown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                {filterMode === "selected" && picked.length === 0 ? "ยังไม่ได้เลือกรายการ" : "ไม่พบรายการที่ตรงกับคำค้นหา"}
              </div>
            ) : (
              shown.map((it, i) => {
                const checked = picked.includes(it.id)
                const initial = (it.label?.trim()?.[0] || "ร").toUpperCase()
                return (
                  <Label
                    key={it.id || `i${i}`}
                    htmlFor={`pick-${i}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 font-normal transition-colors",
                      checked
                        ? "border-primary/45 bg-primary-soft/45"
                        : "border-transparent hover:border-border/70 hover:bg-muted/40",
                    )}
                  >
                    <Checkbox id={`pick-${i}`} checked={checked} onCheckedChange={() => toggle(it.id)} />
                    <div
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {initial}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{it.label}</span>
                      {it.sub && <span className="block truncate text-xs text-muted-foreground">{it.sub}</span>}
                    </span>
                  </Label>
                )
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/35 px-6 py-3.5 sm:justify-between">
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            เลือกแล้ว <strong className="text-foreground">{picked.length}</strong> รายการ
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              ตกลง
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
