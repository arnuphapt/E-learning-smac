"use client"

import { CheckIcon } from "lucide-react"
import { ToneBadge } from "@/components/common/status-badge"
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

/** Shown while rows are ticked: assign one section to all selected users. */
export function BulkSectionBar({
  count,
  sectionsList,
  section,
  saving,
  onSectionChange,
  onClear,
  onAssign,
}: {
  count: number
  sectionsList: SectionSummary[]
  section: string
  saving: boolean
  onSectionChange: (section: string) => void
  onClear: () => void
  onAssign: () => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <ToneBadge tone="primary">เลือกแล้ว {count} รายการ</ToneBadge>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={saving}>
          ล้างการเลือก
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={section || NO_SECTION} onValueChange={(v) => onSectionChange(v === NO_SECTION ? "" : v)}>
          <SelectTrigger aria-label="เลือก Section สำหรับผู้ใช้ที่เลือก" className="w-56">
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
      </div>
    </div>
  )
}
