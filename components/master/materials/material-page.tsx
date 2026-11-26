"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { ErrorState } from "@/components/common/states"
import { MasterListPage, masterActionsColumn, useConfirmDelete } from "@/components/master/list-page"
import { MATERIAL_LABELS, type MaterialKind, type MaterialPayload } from "@/lib/lesson-materials"
import { listMaterials, type MaterialRow } from "@/lib/lesson-materials-client"
import { supabase } from "@/lib/supabase"
import { MaterialEditor } from "./material-editor"

export function MaterialPage({ kind }: { kind: MaterialKind }) {
  const [rows, setRows] = useState<MaterialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<{ row?: MaterialRow } | null>(null)
  const confirmDelete = useConfirmDelete()
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    listMaterials(kind).then((data) => {
      if (!cancelled) { setRows(data); setError(null) }
    }).catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [kind, reloadKey])

  const columns = useMemo<DataTableColumnDef[]>(() => [
    { accessorKey: "title", header: ({ column }) => <ColumnHeader column={column} title="ชื่อต้นแบบ" />, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { id: "content", header: kind === "assignment" ? "เกณฑ์ / คะแนนเต็ม" : "จำนวนคำถาม", cell: ({ row }) => {
      const payload = (row.original as MaterialRow).payload as unknown as MaterialPayload
      return kind === "assignment" ? `${payload.worksheet.criteria.length} เกณฑ์ · ${payload.worksheet.criteria.reduce((sum, c) => sum + c.max, 0)} คะแนน` : `${payload.questions.length} ข้อ`
    } },
    masterActionsColumn<MaterialRow>((row) => setEditing({ row }), async (row) => {
      if (!await confirmDelete("ลบต้นแบบ", `ลบ “${row.title}” หรือไม่? สำเนาที่เลือกใช้ในบทเรียนแล้วจะยังอยู่`)) return
      const { error } = await supabase.from("lesson_material_templates").delete().eq("id", row.id).select("id").single()
      if (error) toast.error(error.message)
      else { toast.success("ลบต้นแบบแล้ว"); reload() }
    }),
  ], [kind, confirmDelete])

  return (
    <MasterListPage title={`คลัง${MATERIAL_LABELS[kind]}`} kicker="การสอน · คลังการสอน" description="สร้างต้นแบบเก็บไว้ครั้งเดียว แล้วเลือกใช้ซ้ำในบทเรียนได้"
      note="แต่ละบทเรียนจะได้สำเนาแยกกัน การแก้ไขหรือลบต้นแบบจะไม่กระทบสำเนาที่ใช้แล้ว"
      addLabel="สร้างต้นแบบ" onAdd={() => setEditing({})}
      data={rows} columns={columns} loading={loading} searchKeys={["title"]} searchPlaceholder="ค้นหาชื่อต้นแบบ…" emptyTitle={`ยังไม่มีต้นแบบ${MATERIAL_LABELS[kind]}`}>
      {error && <ErrorState description={error} onRetry={reload} />}
      {editing && <MaterialEditor kind={kind} row={editing.row} onClose={() => setEditing(null)} onSaved={reload} />}
    </MasterListPage>
  )
}
