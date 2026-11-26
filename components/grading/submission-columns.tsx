"use client"

import { AvatarCell, ColumnHeader, ProgressCell, type DataTableColumnDef } from "@/components/common/data-table"
import { StatusBadge, ToneBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SubmissionRow } from "./scores"

export interface EnrichedSubmission extends SubmissionRow {
  studentName: string
  studentNo: string | null
  section: string | null
  yearLabel: string
}

function FileBadge({ file }: { file: string }) {
  if (file.toLowerCase().endsWith(".pdf")) return <ToneBadge tone="danger">PDF</ToneBadge>
  if (/\.(jpe?g|png|webp|gif)$/i.test(file)) return <ToneBadge tone="success">รูปภาพ</ToneBadge>
  return <ToneBadge tone="primary">ไฟล์แนบ</ToneBadge>
}

const dash = <span className="text-sm text-muted-foreground">—</span>

/** Submission list columns. `onGrade` opens /i/grade/<id>; not-submitted rows have nothing to grade. */
export function submissionColumns(onGrade: (id: string) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "studentName",
      header: ({ column }) => <ColumnHeader column={column} title="นักศึกษา" />,
      cell: ({ row }) => {
        const sub = row.original as EnrichedSubmission
        const can = sub.status !== "not-submitted"
        return (
          <Button
            variant="ghost"
            className={cn("h-auto p-1 text-left font-normal", !can && "opacity-65")}
            disabled={!can}
            onClick={() => onGrade(sub.id)}
          >
            <AvatarCell name={sub.studentName} subtitle={sub.studentNo || "-"} />
          </Button>
        )
      },
    },
    {
      accessorKey: "section",
      header: ({ column }) => <ColumnHeader column={column} title="กลุ่มเรียน" />,
      cell: ({ row }) => {
        const section = row.original.section as string | null
        return section && section !== "ไม่มี" ? <Badge variant="outline">{section}</Badge> : <span className="text-sm text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: "yearLabel",
      header: ({ column }) => <ColumnHeader column={column} title="ชั้นปี" />,
      cell: ({ row }) => <span className="text-sm">{row.original.yearLabel}</span>,
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "file",
      header: "ไฟล์งาน",
      enableSorting: false,
      cell: ({ row }) => (row.original.file ? <FileBadge file={row.original.file as string} /> : dash),
    },
    {
      accessorKey: "submitted_at",
      header: "ส่งเมื่อ",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.submitted_at || "—"}</span>,
    },
    {
      id: "score",
      header: "คะแนน",
      enableSorting: false,
      cell: ({ row }) => {
        const sub = row.original as EnrichedSubmission
        if (sub.score != null) {
          return <ProgressCell value={sub.score} max={sub.total ?? 100} label={`${sub.score}/${sub.total}`} score />
        }
        return sub.status !== "not-submitted" ? <span className="text-sm text-muted-foreground">รอตรวจ</span> : dash
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const sub = row.original as EnrichedSubmission
        if (sub.status === "not-submitted") return null
        return (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => onGrade(sub.id)}>
              {sub.status === "graded" ? "แก้คะแนน" : "ตรวจงาน"}
            </Button>
          </div>
        )
      },
    },
  ]
}
