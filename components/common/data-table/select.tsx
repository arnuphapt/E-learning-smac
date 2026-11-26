/* eslint-disable @typescript-eslint/no-explicit-any -- row type is checked at the call site */
"use client"

import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useDataTable } from "./context"
import type { DataTableColumnDef } from "./features"

/** Opt-in checkbox column. Put it first in `columns`; `rowLabel` names a row for screen readers. */
export function selectionColumn<T>(rowLabel: (row: T) => string): DataTableColumnDef {
  return {
    id: "__select",
    enableSorting: false,
    enableGlobalFilter: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="เลือกทั้งหมด"
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`เลือกแถว ${rowLabel(row.original as T)}`}
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(v === true)}
      />
    ),
  }
}

/**
 * Bar above the rows, shown only while rows are selected (and still visible after search / filter).
 * `children` gets the selected rows and `clear`; call `clear()` after the bulk action finishes.
 */
export function BulkBar<T = any>({
  children,
}: {
  children: (ctx: { rows: T[]; clear: () => void }) => ReactNode
}) {
  const table = useDataTable()
  const rows = table.getFilteredSelectedRowModel().rows.map((r) => r.original as T)
  if (rows.length === 0) return null
  const clear = () => table.resetRowSelection(true)
  return (
    <div
      role="region"
      aria-label="จัดการหลายรายการ"
      className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-primary-soft px-4 py-2.5 sm:px-5"
    >
      <span className="text-sm font-medium text-foreground tabular-nums">เลือก {rows.length} รายการ</span>
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        <XIcon />
        ล้างการเลือก
      </Button>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children({ rows, clear })}</div>
    </div>
  )
}
