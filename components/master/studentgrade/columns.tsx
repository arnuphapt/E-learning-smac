"use client"

import { DEFAULT_DOMAIN } from "@/lib/course-access"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge } from "@/components/common/status-badge"
import { masterActionsColumn } from "@/components/master/list-page"
import type { StudentGradeRow } from "./grade-dialog"

/** Table row: the grade plus search text and the domain with the default filled in (for the filter). */
export type GradeTableRow = StudentGradeRow & { scopeText: string; domainKey: string }

export function gradeColumns(onEdit: (row: GradeTableRow) => void, onDelete: (row: GradeTableRow) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "scopeText",
      header: ({ column }) => <ColumnHeader column={column} title="เลขรหัส 2 ตัวหน้า" />,
      cell: ({ row }) => {
        const g: GradeTableRow = row.original
        return (
          <div className="flex items-center gap-2">
            <div className="grid h-8 min-w-8 place-items-center rounded-lg bg-primary-soft px-2 text-sm font-bold text-primary">
              {g.prefix || "ทั้งโดเมน"}
            </div>
            <span className="font-semibold">
              {g.prefix ? `รหัสประจำตัวขึ้นต้นด้วย ${g.prefix}` : `ทุกคนในโดเมน ${g.domainKey}`}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "domainKey",
      header: ({ column }) => <ColumnHeader column={column} title="โดเมนอีเมล" />,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          {row.original.domainKey}
          {row.original.domainKey !== DEFAULT_DOMAIN && <ToneBadge tone="warning">ภายนอก · ชุดติวเท่านั้น</ToneBadge>}
        </div>
      ),
    },
    {
      accessorKey: "year_label",
      header: ({ column }) => <ColumnHeader column={column} title="ชั้นปีการศึกษา" />,
      cell: ({ row }) => <ToneBadge tone="info">{row.original.year_label}</ToneBadge>,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <ColumnHeader column={column} title="วันที่สร้าง" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </span>
      ),
    },
    masterActionsColumn(onEdit, onDelete),
  ]
}
