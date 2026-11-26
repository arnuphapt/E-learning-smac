"use client"

import { AvatarCell, ColumnHeader, ProgressCell, type DataTableColumnDef } from "@/components/common/data-table"
import { StatusBadge, ToneBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { StudentFallback, SubmissionRow, TestKind, TestScoreRow } from "./scores"

export interface TestScoreItem {
  id: string
  name: string
  studentNo: string | null
  section: string
  student: StudentFallback
  record: TestScoreRow
  pre: number | null
  post: number | null
  total: number | null
  diff: number | null
}

export interface AsgScoreItem {
  id: string
  name: string
  studentNo: string | null
  assignmentTitle: string
  status: string | null
  submittedAt: string | null
  sub: SubmissionRow
}

function ScoreLink({ value, total, onClick }: { value: number | null; total: number | null; onClick: () => void }) {
  if (value == null) return <span className="text-sm text-muted-foreground">ยังไม่ทำ</span>
  return (
    <Button variant="link" className="h-auto p-0 font-semibold" onClick={onClick}>
      {value}/{total}
    </Button>
  )
}

export function testScoreColumns(onOpen: (item: TestScoreItem, kind: TestKind) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="นักศึกษา" />,
      cell: ({ row }) => <AvatarCell name={row.original.name} subtitle={row.original.studentNo || "-"} />,
    },
    {
      accessorKey: "section",
      header: ({ column }) => <ColumnHeader column={column} title="Section" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.section || "-"}</Badge>,
    },
    {
      accessorKey: "pre",
      header: ({ column }) => <ColumnHeader column={column} title="Pre-test" />,
      cell: ({ row }) => <ScoreLink value={row.original.pre} total={row.original.total} onClick={() => onOpen(row.original, "pre")} />,
    },
    {
      accessorKey: "post",
      header: ({ column }) => <ColumnHeader column={column} title="Post-test" />,
      cell: ({ row }) => <ScoreLink value={row.original.post} total={row.original.total} onClick={() => onOpen(row.original, "post")} />,
    },
    {
      accessorKey: "diff",
      header: ({ column }) => <ColumnHeader column={column} title="พัฒนาการ" />,
      cell: ({ row }) => {
        const diff = row.original.diff
        return diff != null ? (
          <ToneBadge tone={diff > 0 ? "success" : "muted"}>
            {diff > 0 ? "+" : ""}
            {diff}
          </ToneBadge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
    },
  ]
}

export const asgScoreColumns: DataTableColumnDef[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <ColumnHeader column={column} title="นักศึกษา" />,
    cell: ({ row }) => <AvatarCell name={row.original.name} subtitle={row.original.studentNo || "-"} />,
  },
  {
    accessorKey: "assignmentTitle",
    header: ({ column }) => <ColumnHeader column={column} title="ใบงาน" />,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.assignmentTitle}</span>,
  },
  {
    accessorKey: "status",
    header: "สถานะ",
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "submittedAt",
    header: "ส่งเมื่อ",
    enableSorting: false,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.submittedAt || "—"}</span>,
  },
  {
    id: "score",
    header: "คะแนน",
    enableSorting: false,
    cell: ({ row }) => {
      const sub = row.original.sub
      return sub.score != null ? (
        <ProgressCell value={sub.score} max={sub.total ?? 100} label={`${sub.score}/${sub.total}`} score />
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )
    },
  },
]
