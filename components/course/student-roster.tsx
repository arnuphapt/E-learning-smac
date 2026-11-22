"use client"

import { useMemo, useState } from "react"
import { UsersIcon } from "lucide-react"
import { DataTable, ColumnHeader, type DataTableColumnDef } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StudentAccessDialog } from "./student-access-dialog"
import { getStudentSectionName, type CourseAssignmentRef, type SectionRow, type StudentRow, type SubmissionRow } from "./detail"

type RosterRow = {
  id: string
  student_no: string
  name: string
  section: string
  special: boolean
  submitted: number
  total: number
}

const columns: DataTableColumnDef[] = [
  {
    accessorKey: "student_no",
    header: ({ column }) => <ColumnHeader column={column} title="รหัสนักศึกษา" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.student_no}</span>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <ColumnHeader column={column} title="ชื่อ-นามสกุล" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-semibold">
        {row.original.name}
        {row.original.special && (
          <Badge variant="secondary" title="นักศึกษาเพิ่มกรณีพิเศษ (Manual)">
            กรณีพิเศษ
          </Badge>
        )}
      </div>
    ),
  },
  { accessorKey: "section", header: ({ column }) => <ColumnHeader column={column} title="Section" /> },
  {
    accessorKey: "submitted",
    header: ({ column }) => <ColumnHeader column={column} title="ความคืบหน้า" />,
    cell: ({ row }) => {
      const { submitted, total } = row.original
      return (
        <div className="flex min-w-32 items-center gap-3">
          <Progress value={total > 0 ? (submitted / total) * 100 : 0} aria-label="ความคืบหน้าการส่งงาน" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {submitted}/{total}
          </span>
        </div>
      )
    },
  },
]

/** "นักศึกษา" tab: enrolled students with assignment progress, plus the manual access dialog. */
export function StudentRoster({
  students,
  courseSubmissions,
  assignments,
  allStudents,
  allowedEmails,
  onUpdateAllowedEmails,
  sectionsList,
}: {
  students: StudentRow[]
  courseSubmissions: SubmissionRow[]
  assignments: CourseAssignmentRef[]
  allStudents: StudentRow[]
  allowedEmails: string[]
  onUpdateAllowedEmails: (emails: string[]) => Promise<void>
  sectionsList: SectionRow[]
}) {
  const [accessOpen, setAccessOpen] = useState(false)

  const rows = useMemo<RosterRow[]>(
    () =>
      students.map((s) => ({
        id: s.id,
        student_no: s.student_no ?? "",
        name: s.name ?? "",
        section: getStudentSectionName(s.student_no, s.section, sectionsList) ?? "-",
        special: Boolean(s.email && allowedEmails.includes(s.email)),
        submitted: courseSubmissions.filter((sub) => sub.student_id === s.id).length,
        total: assignments.length,
      })),
    [students, courseSubmissions, assignments, sectionsList, allowedEmails],
  )

  return (
    <>
      <h2 className="mb-3 text-base font-bold">รายชื่อนักศึกษา ({students.length})</h2>
      <DataTable.Root data={rows} columns={columns} getRowId={(r: RosterRow) => r.id} searchKeys={["name", "student_no"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อ หรือรหัสนักศึกษา..." />
          <DataTable.Actions>
            <Button variant="outline" onClick={() => setAccessOpen(true)}>
              <UsersIcon />
              จัดการนักศึกษาเพิ่มเติม
            </Button>
          </DataTable.Actions>
        </DataTable.Toolbar>
        <DataTable.Content loading={false} empty={<EmptyState title="ไม่มีนักศึกษาในรายวิชานี้" />} />
        <DataTable.Pagination />
      </DataTable.Root>
      {accessOpen && <StudentAccessDialog allStudents={allStudents} allowedEmails={allowedEmails} onClose={() => setAccessOpen(false)} onSave={onUpdateAllowedEmails} />}
    </>
  )
}
