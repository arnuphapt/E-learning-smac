"use client"

import Link from "next/link"
import { ChevronDownIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EnrichedCourse } from "./types"

export function courseColumns({
  expanded,
  onToggle,
  canManage,
  onDelete,
}: {
  expanded: Record<string, boolean>
  onToggle: (courseId: string) => void
  canManage: boolean
  onDelete: (course: EnrichedCourse) => void
}): DataTableColumnDef[] {
  return [
    {
      id: "expand",
      header: () => <span className="sr-only">ขยายบทเรียน</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const c: EnrichedCourse = row.original
        const open = Boolean(expanded[c.id ?? ""])
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={open}
            aria-label={`${open ? "ซ่อน" : "แสดง"}บทเรียนของ ${c.title}`}
            onClick={() => onToggle(c.id ?? "")}
          >
            <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        )
      },
    },
    {
      accessorKey: "title",
      header: ({ column }) => <ColumnHeader column={column} title="รายวิชา" />,
      cell: ({ row }) => {
        const c: EnrichedCourse = row.original
        return (
          <div className="min-w-64">
            <div className="font-semibold">{c.title}</div>
            <div className="text-xs text-muted-foreground">
              {c.code} · {c.subtitle?.slice(0, 28) || ""}…
            </div>
          </div>
        )
      },
    },
    { accessorKey: "term", header: ({ column }) => <ColumnHeader column={column} title="ภาคเรียน" />, cell: ({ row }) => <span className="text-muted-foreground">{row.original.term}</span> },
    { accessorKey: "lessonsCount", header: ({ column }) => <ColumnHeader column={column} title="บทเรียน" />, cell: ({ row }) => <span className="tabular-nums">{row.original.lessonsCount}</span> },
    { accessorKey: "studentCount", header: ({ column }) => <ColumnHeader column={column} title="นักศึกษา" />, cell: ({ row }) => <span className="tabular-nums">{row.original.studentCount}</span> },
    {
      accessorKey: "pendingGrading",
      header: ({ column }) => <ColumnHeader column={column} title="รอตรวจ" />,
      cell: ({ row }) =>
        row.original.pendingGrading > 0 ? (
          <ToneBadge tone="warning">{row.original.pendingGrading} ชิ้น</ToneBadge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "การจัดการ",
      enableSorting: false,
      cell: ({ row }) => {
        const c: EnrichedCourse = row.original
        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={"/i/course/" + c.id}>
                <PencilIcon />
                จัดการรายวิชา
              </Link>
            </Button>
            {canManage && (
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`ลบรายวิชา ${c.title}`} onClick={() => onDelete(c)}>
                <Trash2Icon />
              </Button>
            )}
          </div>
        )
      },
    },
  ]
}
