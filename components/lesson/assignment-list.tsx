"use client"

import { useMemo } from "react"
import { FileIcon, PlusIcon } from "lucide-react"
import { ColumnHeader, DataTable, type DataTableColumnDef } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/states"
import { masterActionsColumn } from "@/components/master/list-page"
import { Button } from "@/components/ui/button"
import type { AssignmentRow } from "./types"

function assignmentColumns(onSelect: (a: AssignmentRow) => void, onDelete: (a: AssignmentRow) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "title",
      header: ({ column }) => <ColumnHeader column={column} title="ใบงาน" />,
      cell: ({ row }) => {
        const a: AssignmentRow = row.original
        return (
          <div className="flex min-w-48 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
              <FileIcon className="size-4" />
            </div>
            <Button variant="link" className="h-auto p-0 font-semibold text-foreground" onClick={() => onSelect(a)}>
              {a.title}
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "points",
      header: ({ column }) => <ColumnHeader column={column} title="คะแนนเต็ม" />,
      cell: ({ row }) => <span>{(row.original as AssignmentRow).points} คะแนน</span>,
    },
    {
      accessorKey: "due",
      header: ({ column }) => <ColumnHeader column={column} title="กำหนดส่ง" />,
      cell: ({ row }) => {
        const a: AssignmentRow = row.original
        return <span className="text-muted-foreground">{a.due} {a.due_time}</span>
      },
    },
    masterActionsColumn<AssignmentRow>(onSelect, onDelete),
  ]
}

/** Assignments of a lesson as a table; picking one opens the editor. */
export function AssignmentList({
  assignments,
  onSelect,
  onDelete,
  onAdd,
}: {
  assignments: AssignmentRow[]
  onSelect: (a: AssignmentRow) => void
  onDelete: (a: AssignmentRow) => void
  onAdd: () => void
}) {
  const columns = useMemo(() => assignmentColumns(onSelect, onDelete), [onSelect, onDelete])
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">ใบงานในบทเรียนนี้ ({assignments.length})</h2>
        <Button onClick={onAdd}>
          <PlusIcon />
          เพิ่มใบงานใหม่
        </Button>
      </div>
      <DataTable.Root data={assignments} columns={columns} getRowId={(a: AssignmentRow) => a.id} searchKeys={["title"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาใบงาน…" />
        </DataTable.Toolbar>
        <DataTable.Content
          empty={
            <EmptyState
              icon={<FileIcon />}
              title="ยังไม่มีใบงานในบทเรียนนี้"
              description="คลิกเพื่อเพิ่มใบงานใหม่"
              action={
                <Button variant="outline" onClick={onAdd}>
                  <PlusIcon />
                  เพิ่มใบงานใหม่
                </Button>
              }
            />
          }
        />
        <DataTable.Pagination />
      </DataTable.Root>
    </div>
  )
}
