"use client"

import Link from "next/link"
import { ArrowRightIcon, CalendarIcon } from "lucide-react"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CourseCodeBadge } from "@/components/student/course/course-code-badge"

export interface AssignmentListRow {
  id: string
  title: string
  due: string | null
  points: number | null
  course_id: string | null
  status: string
  score: number | null
  total: number | null
  courseCode: string
  courseTitle: string
  courseHero: string
}

const actionLabel = (status: string) => (status === "graded" ? "ดูผลคะแนน" : status === "submitted" ? "ตรวจสอบงาน" : "ส่งงาน")

export const assignmentColumns: DataTableColumnDef[] = [
  {
    accessorKey: "title",
    header: ({ column }) => <ColumnHeader column={column} title="ใบงาน" />,
    cell: ({ row }) => {
      const a = row.original as AssignmentListRow
      return (
        <Link href={`/s/assignment/${a.id}`} className="font-semibold hover:underline">
          {a.title}
        </Link>
      )
    },
  },
  {
    accessorKey: "course_id",
    header: ({ column }) => <ColumnHeader column={column} title="รายวิชา" />,
    cell: ({ row }) => {
      const a = row.original as AssignmentListRow
      return (
        <div className="flex flex-col items-start gap-1">
          <CourseCodeBadge>{a.courseCode}</CourseCodeBadge>
          <span className="text-xs text-muted-foreground">{a.courseTitle}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "due",
    header: ({ column }) => <ColumnHeader column={column} title="กำหนดส่ง" />,
    cell: ({ row }) => {
      const a = row.original as AssignmentListRow
      const open = !["submitted", "graded"].includes(a.status)
      return (
        <span className={cn("flex items-center gap-1 text-sm", open ? "font-semibold text-warning" : "text-muted-foreground")}>
          <CalendarIcon className="size-3.5" />
          {a.due}
        </span>
      )
    },
  },
  {
    accessorKey: "points",
    header: "คะแนนเต็ม",
    enableSorting: false,
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.points} คะแนน</span>,
  },
  {
    id: "score",
    header: "คะแนนที่ได้",
    enableSorting: false,
    cell: ({ row }) => {
      const a = row.original as AssignmentListRow
      if (a.status !== "graded") return <span className="text-sm text-muted-foreground">—</span>
      return (
        <span className="font-bold text-success tabular-nums">
          {a.score}
          <span className="text-xs font-normal text-muted-foreground">/{a.total}</span>
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "สถานะ",
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const a = row.original as AssignmentListRow
      return (
        <div className="flex justify-end">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/s/assignment/${a.id}`}>
              {actionLabel(a.status)}
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      )
    },
  },
]
