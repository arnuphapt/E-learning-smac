import { ArrowRightIcon } from "lucide-react"
import { lockSummary } from "@/lib/tutor-bank"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TutorSetSummary } from "./sets"

/** Columns of the tutor-set list: title + code, lessons, bank health, who can enter, open button. */
export function setColumns(onOpen: (set: TutorSetSummary) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "title",
      header: ({ column }) => <ColumnHeader column={column} title="ชุดติว" />,
      cell: ({ row }) => {
        const c: TutorSetSummary = row.original
        return (
          <div className="min-w-48">
            <div className="truncate font-semibold">{c.title}</div>
            <div className="font-mono text-xs text-muted-foreground">{c.code}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "lessonCount",
      header: ({ column }) => <ColumnHeader column={column} title="บทเรียน" />,
      cell: ({ row }) => {
        const c: TutorSetSummary = row.original
        return (
          <span className="whitespace-nowrap tabular-nums">
            {c.lessonCount} บท{c.lessonCount > 0 && <span className="text-muted-foreground"> · เผยแพร่ {c.published}</span>}
          </span>
        )
      },
    },
    {
      accessorKey: "questions",
      header: ({ column }) => <ColumnHeader column={column} title="คลังข้อสอบ" />,
      cell: ({ row }) => {
        const c: TutorSetSummary = row.original
        return (
          <div className="tabular-nums">
            {c.questions} ข้อ
            {c.short > 0 && <div className="text-xs font-semibold text-warning">{c.short} บทคลังไม่พอ</div>}
          </div>
        )
      },
    },
    {
      id: "lock",
      accessorFn: (c: TutorSetSummary) => lockSummary(c).text,
      header: "ใครเข้าได้",
      enableSorting: false,
      cell: ({ row }) => {
        const lock = lockSummary(row.original as TutorSetSummary)
        return <span className={cn("text-sm", !lock.open && "font-semibold text-warning")}>{lock.text}</span>
      },
    },
    {
      id: "open",
      header: "",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpen(row.original as TutorSetSummary)}>
            เปิดชุดนี้
            <ArrowRightIcon />
          </Button>
        </div>
      ),
    },
  ]
}
