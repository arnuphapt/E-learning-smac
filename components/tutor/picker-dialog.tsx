"use client"

import { useState } from "react"
import { CheckIcon, SearchIcon } from "lucide-react"
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
  const [picked, setPicked] = useState<string[]>(selected)
  const [saving, setSaving] = useState(false)
  const needle = q.trim().toLowerCase()
  const shown = needle ? items.filter((it) => (it.label + " " + (it.sub || "")).toLowerCase().includes(needle)) : items
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const save = async () => {
    setSaving(true)
    await onSave(picked)
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc ?? "เลือกรายการที่ต้องการ"}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="ค้นหา…" aria-label="ค้นหา" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ScrollArea className="h-80 rounded-md border">
          {shown.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">ไม่พบรายการ</div>}
          {shown.map((it, i) => (
            <Label key={it.id || `i${i}`} htmlFor={`pick-${i}`} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 font-normal last:border-b-0">
              <Checkbox id={`pick-${i}`} checked={picked.includes(it.id)} onCheckedChange={() => toggle(it.id)} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{it.label}</span>
                {it.sub && <span className="block truncate text-xs text-muted-foreground">{it.sub}</span>}
              </span>
            </Label>
          ))}
        </ScrollArea>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">เลือกแล้ว {picked.length} รายการ</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button onClick={save} disabled={saving}>
              <CheckIcon />
              ตกลง
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
