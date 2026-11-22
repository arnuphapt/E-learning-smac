"use client"

import type { DataTableColumnDef } from "@/components/common/data-table"
import { ColumnHeader } from "@/components/common/data-table"
import { ToneBadge } from "@/components/common/status-badge"
import { masterActionsColumn } from "@/components/master/list-page"
import type { RoleItem } from "./role-dialog"

export const SYSTEM_ROLES = ["admin", "instructor", "student"]

export function roleColumns(onEdit: (row: RoleItem) => void, onDelete: (row: RoleItem) => void): DataTableColumnDef[] {
  return [
    { accessorKey: "id", header: ({ column }) => <ColumnHeader column={column} title="รหัส" />, cell: ({ row }) => <span className="font-mono text-sm">{row.original.id}</span> },
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="ชื่อ Role" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && <div className="mt-1 text-xs text-muted-foreground">{row.original.description}</div>}
        </div>
      ),
    },
    {
      id: "permissionCount",
      accessorFn: (r: RoleItem) => r.permissions.length,
      header: ({ column }) => <ColumnHeader column={column} title="จำนวนสิทธิ์" />,
      cell: ({ row }) => {
        const n = row.original.permissions?.length || 0
        return <ToneBadge tone={n > 0 ? "primary" : "outline"}>{n} สิทธิ์</ToneBadge>
      },
    },
    masterActionsColumn<RoleItem>(onEdit, onDelete, { canDelete: (r) => !SYSTEM_ROLES.includes(r.id) }),
  ]
}
