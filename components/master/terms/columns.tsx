"use client"

import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { masterActionsColumn } from "@/components/master/list-page"
import { MasterStatusBadge } from "@/components/master/status"
import type { TermRow } from "./term-dialog"

export function termColumns(onEdit: (row: TermRow) => void, onDelete: (row: TermRow) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="ภาคเรียน" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      accessorKey: "year",
      header: ({ column }) => <ColumnHeader column={column} title="ปีการศึกษา" />,
      cell: ({ row }) => <span className="text-sm">ปีการศึกษา {row.original.year}</span>,
    },
    { accessorKey: "start_date", header: "เริ่ม", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.start_date}</span> },
    { accessorKey: "end_date", header: "สิ้นสุด", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.end_date}</span> },
    { accessorKey: "status", header: "สถานะ", cell: ({ row }) => <MasterStatusBadge status={row.original.status} /> },
    masterActionsColumn(onEdit, onDelete),
  ]
}
