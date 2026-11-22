"use client"

import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { masterActionsColumn } from "@/components/master/list-page"
import { MasterStatusBadge } from "@/components/master/status"
import type { SubjectGroupItem } from "./group-dialog"
import { managerRoleLabel, type UserRow } from "@/components/common/manager-select"

/** Table row: the group plus its resolved managers (managerNames feeds the search box). */
export type GroupTableRow = SubjectGroupItem & { managers: UserRow[]; managerNames: string }

export function groupColumns(onEdit: (row: GroupTableRow) => void, onDelete: (row: GroupTableRow) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="กลุ่มวิชา" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      id: "managers",
      accessorKey: "managerNames",
      header: "อาจารย์ผู้รับผิดชอบประจำกลุ่มวิชา",
      enableSorting: false,
      cell: ({ row }) => {
        const managers: UserRow[] = row.original.managers
        if (managers.length === 0) return <span className="text-sm text-muted-foreground">- ยังไม่มีอาจารย์ผู้รับผิดชอบ -</span>
        return (
          <div className="flex flex-col gap-1">
            {managers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <Avatar className="size-6">
                  <AvatarFallback className="text-xs">{(m.name ? m.name.replace(/^อ\. (ดร\. )?/, "") : "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <span>
                  {m.name} ({managerRoleLabel(m.role)})
                </span>
              </div>
            ))}
          </div>
        )
      },
    },
    { accessorKey: "courses", header: ({ column }) => <ColumnHeader column={column} title="รายวิชา" />, cell: ({ row }) => row.original.courses || 0 },
    { accessorKey: "status", header: "สถานะ", cell: ({ row }) => <MasterStatusBadge status={row.original.status} /> },
    masterActionsColumn(onEdit, onDelete),
  ]
}
