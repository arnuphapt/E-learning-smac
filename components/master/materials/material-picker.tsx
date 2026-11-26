"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { LibraryIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { ColumnHeader, DataTable, type DataTableColumnDef } from "@/components/common/data-table"
import { FormField } from "@/components/common/form-field"
import { EmptyState, ErrorState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getTodayStr } from "@/components/lesson/types"
import { MATERIAL_LABELS, type MaterialKind, type MaterialPayload, validateMaterial } from "@/lib/lesson-materials"
import { listMaterials, type MaterialRow } from "@/lib/lesson-materials-client"
import { supabase } from "@/lib/supabase"

const MASTER_PATHS: Record<MaterialKind, string> = { pre: "/i/master/pretests", post: "/i/master/posttests", assignment: "/i/master/worksheets" }

function PickerDialog({ kind, lessonId, onClose, onCopied }: {
  kind: MaterialKind; lessonId: string; onClose: () => void; onCopied: () => void
}) {
  const [rows, setRows] = useState<MaterialRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [due, setDue] = useState(kind === "assignment" ? getTodayStr() : "")
  const [dueTime, setDueTime] = useState("23:59")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const selected = rows.find((r) => r.id === selectedId)

  useEffect(() => {
    let cancelled = false
    listMaterials(kind).then((data) => { if (!cancelled) { setRows(data); setError(null) } })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [kind, reloadKey])

  const columns = useMemo<DataTableColumnDef[]>(() => [
    { accessorKey: "title", header: ({ column }) => <ColumnHeader column={column} title="ชื่อต้นแบบ" /> },
    { id: "choose", header: "เลือกใช้", enableSorting: false, cell: ({ row }) => {
      const r = row.original as MaterialRow
      return <Button type="button" variant={selectedId === r.id ? "default" : "outline"} size="sm" disabled={busy} aria-pressed={selectedId === r.id} onClick={() => setSelectedId(r.id)}>{selectedId === r.id ? "เลือกแล้ว" : "เลือก"}</Button>
    } },
  ], [selectedId, busy])

  const copy = async () => {
    if (!selected || busy) return
    if (kind === "assignment" && !due) { setError("กรุณากำหนดวันส่งใบงาน"); return }
    setBusy(true)
    setError(null)
    try {
      const problem = validateMaterial(kind, selected.title, selected.payload as unknown as MaterialPayload)
      if (problem) throw new Error(problem)
      const { error } = await supabase.rpc("copy_lesson_material", {
        p_template: selected.id, p_lesson: lessonId, ...(due ? { p_due: due } : {}), p_due_time: dueTime,
      })
      if (error) throw new Error(error.message)
      toast.success(`คัดลอก ${MATERIAL_LABELS[kind]} มาใช้ในบทเรียนแล้ว`)
      onCopied()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>เลือกต้นแบบ{MATERIAL_LABELS[kind]}</DialogTitle>
          <DialogDescription>คัดลอกมาใช้ในบทเรียนนี้ แล้วแก้ไขแยกจากต้นแบบได้</DialogDescription>
        </DialogHeader>
        <DataTable.Root data={rows} columns={columns} getRowId={(r: MaterialRow) => r.id} searchKeys={["title"]}>
          <DataTable.Toolbar><DataTable.Search placeholder="ค้นหาชื่อต้นแบบ…" /></DataTable.Toolbar>
          <DataTable.Content loading={loading} empty={<EmptyState title="ยังไม่มีต้นแบบให้เลือก" action={<Button variant="outline" asChild><Link href={MASTER_PATHS[kind]}>ไปสร้างต้นแบบ</Link></Button>} />} />
          <DataTable.Pagination />
        </DataTable.Root>
        {selected && <div className="grid gap-3 border-t pt-4">
          <p className="break-words text-sm font-medium">เลือก: {selected.title}</p>
          <p className="text-sm text-muted-foreground">{kind === "assignment"
            ? `${(selected.payload as unknown as MaterialPayload).worksheet.criteria.length} เกณฑ์การให้คะแนน`
            : `${(selected.payload as unknown as MaterialPayload).questions.length} คำถาม`}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={kind === "assignment" ? "กำหนดส่งใบงาน" : "วันครบกำหนด (เว้นว่างได้)"} htmlFor="material-due" required={kind === "assignment"}>
              <Input id="material-due" type="date" value={due} disabled={busy} onChange={(e) => setDue(e.target.value)} />
            </FormField>
            <FormField label="เวลา" htmlFor="material-due-time"><Input id="material-due-time" type="time" value={dueTime} disabled={busy} onChange={(e) => setDueTime(e.target.value)} /></FormField>
          </div>
        </div>}
        {error && <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>ยกเลิก</Button>
          <Button type="button" disabled={busy || !selected || (kind === "assignment" && !due)} onClick={() => void copy()}>{busy && <Loader2Icon className="animate-spin" />}คัดลอกมาใช้ในบทเรียน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Mounted on demand so both lesson editors always read a fresh master list. */
export function MaterialPicker({ kind, lessonId, onCopied, disabled = false }: {
  kind: MaterialKind; lessonId: string; onCopied: () => void; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return <>
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}><LibraryIcon />เลือกจากคลัง</Button>
    {disabled && <span className="text-xs text-muted-foreground">เลือกต้นแบบได้เมื่อยังไม่มีข้อสอบในส่วนนี้</span>}
    {open && <PickerDialog kind={kind} lessonId={lessonId} onCopied={onCopied} onClose={() => setOpen(false)} />}
  </>
}
