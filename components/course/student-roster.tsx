"use client"

import { useMemo, useState } from "react"
import { UsersIcon } from "lucide-react"
import { AvatarCell, ColumnHeader, DataTable, ProgressCell, type DataTableColumnDef } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
      <AvatarCell
        name={row.original.name}
        badge={
          row.original.special ? (
            <Badge variant="secondary" title="นักศึกษาเพิ่มกรณีพิเศษ (Manual)">
              กรณีพิเศษ
            </Badge>
          ) : undefined
        }
      />
    ),
  },
  { accessorKey: "section", header: ({ column }) => <ColumnHeader column={column} title="Section" /> },
  {
    accessorKey: "submitted",
    header: ({ column }) => <ColumnHeader column={column} title="ความคืบหน้า" />,
    cell: ({ row }) => (
      <ProgressCell
        value={row.original.submitted}
        max={row.original.total}
        label={`${row.original.submitted}/${row.original.total}`}
      />
    ),
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">รายชื่อนักศึกษา ({students.length})</h2>
        <Button variant="outline" onClick={() => setAccessOpen(true)}>
          <UsersIcon />
          จัดการนักศึกษาเพิ่มเติม
        </Button>
      </div>
      <DataTable.Root data={rows} columns={columns} getRowId={(r: RosterRow) => r.id} searchKeys={["name", "student_no"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อ หรือรหัสนักศึกษา..." />
        </DataTable.Toolbar>
        <DataTable.Content loading={false} empty={<EmptyState title="ไม่มีนักศึกษาในรายวิชานี้" />} />
        <DataTable.Pagination />
      </DataTable.Root>
      {accessOpen && <StudentAccessDialog allStudents={allStudents} allowedEmails={allowedEmails} onClose={() => setAccessOpen(false)} onSave={onUpdateAllowedEmails} />}
    </>
  )
}
