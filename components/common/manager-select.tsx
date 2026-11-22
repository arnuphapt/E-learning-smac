"use client"

import type { Database } from "@/lib/database.types"
import { MultiSelect } from "@/components/common/multi-select"

export type UserRow = Database["public"]["Tables"]["users"]["Row"]

export const managerRoleLabel = (role: string | null | undefined) => (role === "course_manager" ? "ผู้รับผิดชอบ" : "ผู้สอน")

/** Multi-select of instructors: popover list with search, selected users shown as removable chips. */
export function ManagerSelect({
  id,
  options,
  selectedValues,
  onChange,
  placeholder = "เลือกคณาจารย์...",
}: {
  id: string
  options: UserRow[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  return (
    <MultiSelect
      id={id}
      options={options.map((u) => ({ value: u.id, label: u.name, description: `${managerRoleLabel(u.role)} · ${u.email}` }))}
      selectedValues={selectedValues}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาคณาจารย์…"
      emptyText="ไม่มีข้อมูลผู้ใช้งาน"
      unit="คน"
    />
  )
}
