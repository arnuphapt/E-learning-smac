"use client"

import { PinIcon, RefreshCwIcon } from "lucide-react"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge } from "@/components/common/status-badge"
import { masterActionsColumn } from "@/components/master/list-page"
import type { BroadcastRow } from "./broadcast-dialog"

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—"

export function broadcastColumns(
  canManage: boolean,
  onEdit: (row: BroadcastRow) => void,
  onDelete: (row: BroadcastRow) => void,
  onResend: (row: BroadcastRow) => void,
): DataTableColumnDef[] {
  return [
    {
      accessorKey: "title",
      header: ({ column }) => <ColumnHeader column={column} title="หัวข้อ" />,
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            {row.original.pinned && <PinIcon aria-label="ปักหมุด" className="size-4 text-primary" />}
            <span className="font-semibold">{row.original.title}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{formatDate(row.original.created_at)}</div>
        </div>
      ),
    },
    {
      id: "target",
      header: "กลุ่มเป้าหมาย",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.year_level && row.original.year_level.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.year_level.map((y: number) => (
              <ToneBadge key={y} tone="primary">
                ปี {y}
              </ToneBadge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">ทุกชั้นปี</span>
        ),
    },
    {
      accessorKey: "body",
      header: "เนื้อหา",
      enableSorting: false,
      cell: ({ row }) => <div className="max-w-xs truncate text-sm text-muted-foreground">{row.original.body}</div>,
    },
    {
      accessorKey: "expires_at",
      header: ({ column }) => <ColumnHeader column={column} title="หมดอายุ" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.expires_at)}</span>,
    },
    {
      id: "status",
      header: "สถานะ",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.expires_at && new Date(row.original.expires_at) < new Date() ? (
          <ToneBadge tone="muted">หมดอายุ</ToneBadge>
        ) : (
          <ToneBadge tone="success">ใช้งานอยู่</ToneBadge>
        ),
    },
    canManage
      ? masterActionsColumn<BroadcastRow>(onEdit, onDelete, {
          extra: (r) => [{ label: "ส่งประกาศซ้ำ", icon: <RefreshCwIcon />, onSelect: () => onResend(r) }],
        })
      : { id: "actions", header: "", enableSorting: false, cell: () => null },
  ]
}
