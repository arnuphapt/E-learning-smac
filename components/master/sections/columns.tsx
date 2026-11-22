"use client"

import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge } from "@/components/common/status-badge"
import { masterActionsColumn } from "@/components/master/list-page"
import { MasterStatusBadge } from "@/components/master/status"
import type { SectionItem } from "./section-dialog"

/** Table row: the section plus its computed student count. */
export type SectionTableRow = SectionItem & { count: number }

export function sectionColumns(onEdit: (row: SectionTableRow) => void, onDelete: (row: SectionTableRow) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="Section" />,
      cell: ({ row }) => <ToneBadge tone="primary">{row.original.name}</ToneBadge>,
    },
    {
      accessorKey: "year_level",
      header: ({ column }) => <ColumnHeader column={column} title="ชั้นปี" />,
      cell: ({ row }) => row.original.year_level || <span className="text-sm text-muted-foreground">ไม่ระบุ</span>,
    },
    {
      id: "range",
      header: "ช่วงรหัสนักศึกษา (3 ตัวท้าย)",
      enableSorting: false,
      cell: ({ row }) => {
        const { range_start, range_end } = row.original
        return range_start && range_end ? `${range_start}–${range_end}` : <span className="text-muted-foreground">—</span>
      },
    },
    { accessorKey: "count", header: ({ column }) => <ColumnHeader column={column} title="จำนวนนักศึกษา" /> },
    { accessorKey: "status", header: "สถานะ", cell: ({ row }) => <MasterStatusBadge status={row.original.status} /> },
    masterActionsColumn(onEdit, onDelete),
  ]
}
