"use client"

import { DownloadIcon, FileSpreadsheetIcon, FilterIcon } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { FormField } from "@/components/common/form-field"
import { AvatarCell, DataTable, ProgressCell, type DataTableColumnDef } from "@/components/common/data-table"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type CourseRow = Database["public"]["Views"]["courses"]["Row"]
type StudentRow = Database["public"]["Tables"]["users"]["Row"]
type TestScoreRow = Database["public"]["Tables"]["test_scores"]["Row"]
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]

/** Course / lesson / section filters. Only the course filter drives the export; the other two are display-only placeholders (as before). */
export function ReportFilters({ courses, course, onCourseChange }: { courses: CourseRow[]; course: string | null; onCourseChange: (id: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FilterIcon className="size-4 text-primary" />
          ตัวกรองข้อมูล
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <FormField label="รายวิชา" htmlFor="report-course">
          <Select value={course ?? undefined} onValueChange={onCourseChange}>
            <SelectTrigger id="report-course" className="w-full">
              <SelectValue placeholder="เลือกรายวิชา" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id ?? ""}>
                  {c.code} {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="บทเรียน / ใบงาน" htmlFor="report-lesson">
          <Select defaultValue="all">
            <SelectTrigger id="report-lesson" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกบทเรียน</SelectItem>
              <SelectItem value="l1">บทที่ 1 — หัวใจล้มเหลว</SelectItem>
              <SelectItem value="a1">ใบงานที่ 1</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Section" htmlFor="report-section">
          <Select defaultValue="all">
            <SelectTrigger id="report-section" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก Section</SelectItem>
              <SelectItem value="s1">Sec 1</SelectItem>
              <SelectItem value="s2">Sec 2</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  )
}

/** Checkbox grid choosing which columns go into the export file. */
export function ColumnPicker({ columns, selected, onToggle }: { columns: string[]; selected: boolean[]; onToggle: (index: number) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">เลือกคอลัมน์ที่ต้องการส่งออก</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {columns.map((label, i) => (
          <Label
            key={label}
            htmlFor={`report-col-${i}`}
            className={cn("cursor-pointer rounded-lg border px-3 py-2.5", selected[i] ? "border-primary bg-primary-soft font-semibold text-primary-soft-foreground" : "font-normal")}
          >
            <Checkbox id={`report-col-${i}`} checked={selected[i]} onCheckedChange={() => onToggle(i)} />
            {label}
          </Label>
        ))}
      </CardContent>
    </Card>
  )
}

/** First rows of the export, as it will look in the file. */
export function ReportPreview({ students, testScores, submissions }: { students: StudentRow[]; testScores: TestScoreRow[]; submissions: SubmissionRow[] }) {
  const columns: DataTableColumnDef[] = [
    { accessorKey: "name", header: "ชื่อ-นามสกุล", cell: ({ row }) => <AvatarCell name={row.original.name} /> },
    { accessorKey: "student_no", header: "รหัส", cell: ({ row }) => <span className="tabular-nums">{row.original.student_no || "-"}</span> },
    { accessorKey: "section", header: "Sec", cell: ({ row }) => row.original.section || "-" },
    { id: "pre", header: "Pre", cell: ({ row }) => <span className="tabular-nums">{testScores.find((x) => x.student_id === row.original.id)?.pre ?? "-"}</span> },
    { id: "post", header: "Post", cell: ({ row }) => <span className="tabular-nums">{testScores.find((x) => x.student_id === row.original.id)?.post ?? "-"}</span> },
    {
      id: "score",
      header: "ใบงาน",
      cell: ({ row }) => {
        const sub = submissions.find((x) => x.student_id === row.original.id)
        return sub && sub.score != null ? (
          <ProgressCell value={sub.score} max={sub.total ?? 100} label={String(sub.score)} score />
        ) : (
          <span className="tabular-nums">-</span>
        )
      },
    },
    {
      id: "status",
      header: "สถานะ",
      cell: ({ row }) => <StatusBadge status={submissions.find((x) => x.student_id === row.original.id)?.status ?? "not-submitted"} />,
    },
  ]
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">ตัวอย่างข้อมูล</CardTitle>
        <span className="text-xs text-muted-foreground">{students.length} แถว</span>
      </CardHeader>
      <CardContent>
        <DataTable.Root data={students.slice(0, 10)} columns={columns} getRowId={(s: StudentRow) => s.id}>
          <DataTable.Content />
        </DataTable.Root>
      </CardContent>
    </Card>
  )
}

/** Right-hand panel: file format, summary and the download button. */
export function ExportPanel({
  courseCode,
  rowCount,
  columnCount,
  format,
  onFormatChange,
  onExport,
}: {
  courseCode: string
  rowCount: number
  columnCount: number
  format: "all" | "csv"
  onFormatChange: (format: "all" | "csv") => void
  onExport: () => void
}) {
  return (
    <div className="grid gap-4 lg:sticky lg:top-4">
      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
            <FileSpreadsheetIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-sm">ส่งออกเป็น Excel</CardTitle>
            <div className="text-xs text-muted-foreground">.xlsx · พร้อมใช้งาน</div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">รายวิชา</span>
              <span className="font-semibold">{courseCode || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">จำนวนแถว</span>
              <span className="font-semibold">{rowCount} คน</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">คอลัมน์ที่เลือก</span>
              <span className="font-semibold">{columnCount} คอลัมน์</span>
            </div>
          </div>
          <Separator />
          <FormField label="รูปแบบไฟล์" htmlFor="report-format">
            <ToggleGroup
              id="report-format"
              type="single"
              variant="outline"
              value={format}
              onValueChange={(v) => v && onFormatChange(v as "all" | "csv")}
              aria-label="รูปแบบไฟล์"
              className="w-full"
            >
              <ToggleGroupItem value="all" className="flex-1 data-[state=on]:bg-primary-soft data-[state=on]:text-primary-soft-foreground">
                Excel (.xlsx)
              </ToggleGroupItem>
              <ToggleGroupItem value="csv" className="flex-1 data-[state=on]:bg-primary-soft data-[state=on]:text-primary-soft-foreground">
                CSV
              </ToggleGroupItem>
            </ToggleGroup>
          </FormField>
          <Button size="lg" onClick={onExport}>
            <DownloadIcon />
            ดาวน์โหลดคะแนน
          </Button>
          <p className="text-center text-xs text-muted-foreground">ไฟล์จะรวมแยกชีตตามบทเรียน</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ส่งออกล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {[
            ["NUR301_คะแนนรวม.xlsx", "วันนี้ 09:41"],
            ["ใบงาน1_Sec1.xlsx", "เมื่อวาน"],
          ].map(([name, when]) => (
            <div key={name} className="flex items-center gap-2 text-sm">
              <FileSpreadsheetIcon className="size-4 text-success" />
              <span className="flex-1 truncate">{name}</span>
              <span className="text-xs text-muted-foreground">{when}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
