"use client"

import { CheckIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RoleSummary, SectionSummary } from "./user-dialog"

const ALL = "all"

/** Role + grade-level filters shown next to the search box. Grade only applies to students. */
export function UserFilters({
  rolesList,
  gradeLabels,
  filterRole,
  filterGrade,
  onRoleChange,
  onGradeChange,
}: {
  rolesList: RoleSummary[]
  gradeLabels: string[]
  filterRole: string
  filterGrade: string
  onRoleChange: (role: string) => void
  onGradeChange: (grade: string) => void
}) {
  return (
    <>
      <Select value={filterRole} onValueChange={onRoleChange}>
        <SelectTrigger aria-label="กรองตามบทบาท" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>บทบาท: ทั้งหมด</SelectItem>
          {rolesList.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(filterRole === ALL || filterRole === "student") && (
        <Select value={filterGrade} onValueChange={onGradeChange}>
          <SelectTrigger aria-label="กรองตามชั้นปี" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ชั้นปี: ทั้งหมด</SelectItem>
            {gradeLabels.map((lbl) => (
              <SelectItem key={lbl} value={lbl}>
                {lbl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  )
}

const NO_SECTION = "__none__"

/** Content of `<DataTable.BulkBar>` for users: assign one section to, or delete, all selected users. */
export function BulkUserActions({
  sectionsList,
  section,
  saving,
  onSectionChange,
  onAssign,
  onDelete,
}: {
  sectionsList: SectionSummary[]
  section: string
  saving: boolean
  onSectionChange: (section: string) => void
  onAssign: () => void
  onDelete: () => void
}) {
  return (
    <>
      <Select value={section || NO_SECTION} onValueChange={(v) => onSectionChange(v === NO_SECTION ? "" : v)}>
        <SelectTrigger aria-label="เลือก Section สำหรับผู้ใช้ที่เลือก" className="h-9 w-56 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_SECTION}>เลือก Section...</SelectItem>
          {sectionsList.map((s) => (
            <SelectItem key={s.id} value={s.name || s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" onClick={onAssign} disabled={!section || saving}>
        <CheckIcon />
        {saving ? "กำลังบันทึก…" : "กำหนด Section"}
      </Button>
      <Button type="button" size="sm" variant="destructive" onClick={onDelete} disabled={saving}>
        <Trash2Icon />
        ลบที่เลือก
      </Button>
    </>
  )
}
