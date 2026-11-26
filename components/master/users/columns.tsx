"use client"

import { EyeIcon } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { AvatarCell, ColumnHeader, selectionColumn, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge, type StatusTone } from "@/components/common/status-badge"
import { masterActionsColumn } from "@/components/master/list-page"
import type { RoleSummary, SubjectGroupRow, UserItem } from "./user-dialog"

type StudentGradeRow = Database["public"]["Tables"]["student_grades"]["Row"]
type SubjectGroupManagerRow = Database["public"]["Tables"]["subject_group_managers"]["Row"]

const splitRoles = (role: string | null) => (role ? role.split(",").map((r) => r.trim()) : [])

const roleTone = (roleId: string): StatusTone =>
  roleId === "admin" ? "danger" : roleId === "instructor" ? "primary" : roleId === "student" ? "info" : "outline"

export function userColumns({
  rolesList,
  subjectGroups,
  groupManagers,
  gradesList,
  canImpersonate,
  onImpersonate,
  onEdit,
  onDelete,
}: {
  rolesList: RoleSummary[]
  subjectGroups: SubjectGroupRow[]
  groupManagers: SubjectGroupManagerRow[]
  gradesList: StudentGradeRow[]
  canImpersonate: boolean
  onImpersonate: (row: UserItem) => void
  onEdit: (row: UserItem) => void
  onDelete: (row: UserItem) => void
}): DataTableColumnDef[] {
  return [
    selectionColumn<UserItem>((u) => u.name || u.email || u.id),
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="ชื่อ-นามสกุล" />,
      cell: ({ row }) => <AvatarCell name={row.original.name} />,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <ColumnHeader column={column} title="อีเมล" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "บทบาท",
      enableSorting: false,
      cell: ({ row }) => {
        const u: UserItem = row.original
        const userGroupIds = groupManagers.filter((sgm) => sgm.user_id === u.id).map((sgm) => sgm.group_id)
        const userGroupNames = subjectGroups.filter((g) => userGroupIds.includes(g.id)).map((g) => g.name)
        const groupsDisplay = userGroupNames.length > 0 ? userGroupNames.join(", ") : u.group_id && subjectGroups.find((g) => g.id === u.group_id)?.name
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              {splitRoles(u.role).map((roleId) => (
                <ToneBadge key={roleId} tone={roleTone(roleId)}>
                  {rolesList.find((x) => x.id === roleId)?.name ?? roleId}
                </ToneBadge>
              ))}
            </div>
            {groupsDisplay && <div className="text-xs text-muted-foreground">{groupsDisplay}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: "studentId",
      header: ({ column }) => <ColumnHeader column={column} title="รหัสประจำตัว / ตำแหน่ง" />,
      cell: ({ row }) => {
        const u: UserItem = row.original
        const isStudent = splitRoles(u.role).includes("student")
        const prefix = u.studentId ? String(u.studentId).slice(0, 2) : ""
        const mapping = isStudent && prefix ? gradesList.find((g) => g.prefix === prefix) : null
        const secDisplay = u.sec && u.sec !== "ไม่มี" ? `Sec: ${u.sec}` : ""
        const sub = [mapping ? mapping.year_label : "", secDisplay].filter(Boolean).join(" · ")
        return (
          <div className="text-sm tabular-nums">
            <div>{u.studentId || "-"}</div>
            {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.status === "active" ? <ToneBadge tone="success">ใช้งาน</ToneBadge> : <ToneBadge tone="warning">ระงับ</ToneBadge>,
    },
    masterActionsColumn<UserItem>(onEdit, onDelete, {
      extra: (u) => (canImpersonate ? [{ label: "ดูมุมมองผู้ใช้ (Impersonate)", icon: <EyeIcon />, onSelect: () => onImpersonate(u) }] : []),
    }),
  ]
}
