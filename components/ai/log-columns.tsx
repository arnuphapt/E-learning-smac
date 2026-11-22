"use client"

import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge } from "@/components/common/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { EnrichedAiLog } from "./log-types"

export function aiLogColumns(onView: (log: EnrichedAiLog) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "studentName",
      header: ({ column }) => <ColumnHeader column={column} title="นักศึกษา" />,
      cell: ({ row }) => {
        const log: EnrichedAiLog = row.original
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{(log.studentName || "?").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{log.studentName}</div>
              <div className="text-xs text-muted-foreground">{log.studentNo}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "courseCode",
      header: ({ column }) => <ColumnHeader column={column} title="รายวิชา / บทเรียน" />,
      cell: ({ row }) => {
        const log: EnrichedAiLog = row.original
        return (
          <div>
            <div className="text-sm font-semibold">{log.courseCode}</div>
            <div className="max-w-44 truncate text-xs text-muted-foreground">
              บทที่ {log.lessonIndex}: {log.lessonTitle}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "mode",
      header: "รูปแบบ",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.mode === "summarize" ? <ToneBadge tone="primary">สรุปบทเรียน</ToneBadge> : <ToneBadge tone="info">ถามตอบ (Chat)</ToneBadge>,
    },
    {
      accessorKey: "message",
      header: "คำถามล่าสุด",
      enableSorting: false,
      cell: ({ row }) => <div className="max-w-72 truncate text-sm font-medium">{row.original.message}</div>,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <ColumnHeader column={column} title="วันที่สอบถาม" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.created_at ?? 0).toLocaleString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => onView(row.original)}>
          ดูรายละเอียด
        </Button>
      ),
    },
  ]
}
