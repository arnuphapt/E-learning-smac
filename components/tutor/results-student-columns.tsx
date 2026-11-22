import { emailDomain } from "@/lib/course-access"
import { formatClock, type StudentLessonSummary } from "@/lib/tutor-results"
import { ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge, type StatusTone } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TutorUserEntry } from "./results-data"
import { fmtDate } from "./format"

const TONE = { weak: "danger", fair: "warning", strong: "success" } as const satisfies Record<string, StatusTone>
const WEAK_TEXT: Record<string, string> = { weak: "text-destructive", fair: "text-warning", strong: "text-success" }

/** Columns of the per-student results table; clicking the name opens the student's rounds. */
export function studentResultColumns(users: ReadonlyMap<string, TutorUserEntry>, onOpen: (s: StudentLessonSummary) => void): DataTableColumnDef[] {
  const userOf = (s: StudentLessonSummary) => users.get(s.student_id)
  return [
    {
      id: "name",
      accessorFn: (s: StudentLessonSummary) => userOf(s)?.name || "(ไม่พบผู้ใช้)",
      header: ({ column }) => <ColumnHeader column={column} title="ชื่อ" />,
      cell: ({ row }) => {
        const st: StudentLessonSummary = row.original
        const name = userOf(st)?.name
        return (
          <Button variant="link" className="h-auto max-w-56 justify-start p-0 font-semibold" onClick={() => onOpen(st)} aria-label={"ดูผลของ " + (name || "นักศึกษา")}>
            <span className="truncate">{name || "(ไม่พบผู้ใช้)"}</span>
          </Button>
        )
      },
    },
    {
      id: "student_no",
      accessorFn: (s: StudentLessonSummary) => userOf(s)?.student_no || "—",
      header: ({ column }) => <ColumnHeader column={column} title="รหัสนักศึกษา" />,
      cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() as string}</span>,
    },
    {
      id: "domain",
      accessorFn: (s: StudentLessonSummary) => emailDomain(userOf(s)?.email) || "—",
      header: "โดเมน",
      enableSorting: false,
      cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() as string}</span>,
    },
    {
      id: "rounds",
      accessorFn: (s: StudentLessonSummary) => s.rounds,
      header: ({ column }) => <ColumnHeader column={column} title="รอบ" />,
      cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span>,
    },
    {
      id: "best",
      accessorFn: (s: StudentLessonSummary) => s.best.percent,
      header: ({ column }) => <ColumnHeader column={column} title="คะแนนดีที่สุด" />,
      cell: ({ row }) => {
        const { best }: StudentLessonSummary = row.original
        return (
          <ToneBadge tone={TONE[best.status]}>
            {best.score}/{best.total} · {best.percent}%
          </ToneBadge>
        )
      },
    },
    {
      id: "seconds",
      accessorFn: (s: StudentLessonSummary) => s.best.seconds ?? 0,
      header: "เวลาที่ใช้",
      enableSorting: false,
      cell: ({ row }) => <span className="tabular-nums">{formatClock((row.original as StudentLessonSummary).best.seconds)}</span>,
    },
    {
      id: "latestAt",
      accessorFn: (s: StudentLessonSummary) => s.latestAt ?? "",
      header: ({ column }) => <ColumnHeader column={column} title="ทำล่าสุด" />,
      cell: ({ row }) => <span className="whitespace-nowrap text-sm">{fmtDate((row.original as StudentLessonSummary).latestAt, true)}</span>,
    },
    {
      id: "weakest",
      accessorFn: (s: StudentLessonSummary) => s.weakest?.name ?? "",
      header: "หัวข้อที่อ่อนที่สุด",
      enableSorting: false,
      cell: ({ row }) => {
        const { weakest }: StudentLessonSummary = row.original
        return weakest ? (
          <span className="block max-w-48 truncate" title={weakest.name}>
            <span className={cn("font-semibold tabular-nums", weakest.status && WEAK_TEXT[weakest.status])}>{weakest.percent}%</span> {weakest.name}
          </span>
        ) : (
          "—"
        )
      },
    },
  ]
}
