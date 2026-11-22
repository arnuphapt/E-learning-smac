"use client"

import { CalendarIcon } from "lucide-react"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { masterActionsColumn } from "@/components/master/list-page"
import { MasterStatusBadge } from "@/components/master/status"
import type { AcademicYearRow } from "./year-dialog"

export function yearColumns(onEdit: (row: AcademicYearRow) => void, onDelete: (row: AcademicYearRow) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "label",
      header: ({ column }) => <ColumnHeader column={column} title="ปีการศึกษา" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
            <CalendarIcon className="size-4" />
          </div>
          <span className="font-semibold">{row.original.label}</span>
        </div>
      ),
    },
    { accessorKey: "start_date", header: "เริ่ม", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.start_date}</span> },
    { accessorKey: "end_date", header: "สิ้นสุด", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.end_date}</span> },
    { accessorKey: "courses", header: ({ column }) => <ColumnHeader column={column} title="รายวิชา" />, cell: ({ row }) => row.original.courses || 0 },
    { accessorKey: "status", header: "สถานะ", cell: ({ row }) => <MasterStatusBadge status={row.original.status} /> },
    masterActionsColumn(onEdit, onDelete),
  ]
}
