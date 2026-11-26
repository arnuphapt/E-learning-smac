"use client"

import { useState } from "react"
import type { Database } from "@/lib/database.types"
import { hasRole } from "@/lib/roles"
import { FormField } from "@/components/common/form-field"
import { Input } from "@/components/ui/input"
import { MasterFormDialog } from "@/components/master/form-dialog"
import { MASTER_STATUS_BASIC, StatusField } from "@/components/master/status"
import { ManagerSelect, type UserRow } from "@/components/common/manager-select"

export type SubjectGroupManagerRow = Database["public"]["Tables"]["subject_group_managers"]["Row"]

export interface SubjectGroupItem {
  id: string
  name: string | null
  status: string | null
  courses: number | null
  head?: string | null
}

export interface GroupSaveInput {
  name: string
  status: string
  courses: number
  selectedManagers: string[]
}

export function GroupDialog({
  mode,
  row,
  instructors,
  groupManagers,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row?: SubjectGroupItem
  instructors: UserRow[]
  groupManagers: SubjectGroupManagerRow[]
  onClose: () => void
  onSave: (values: GroupSaveInput) => void
}) {
  const [name, setName] = useState(row ? row.name || "" : "")
  const [status, setStatus] = useState(row ? row.status || "active" : "active")
  const [selectedManagers, setSelectedManagers] = useState<string[]>(
    row ? groupManagers.filter((u) => u.group_id === row.id).map((u) => u.user_id) : [],
  )
  const [nameError, setNameError] = useState<string>()
  const managerOptions = instructors.filter((u) => hasRole(u.role, "course_manager", "instructor"))

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("กรุณากรอกชื่อกลุ่มวิชา")
      document.getElementById("group-name")?.focus()
      return
    }
    onSave({ name, status, courses: row ? row.courses || 0 : 0, selectedManagers })
  }

  return (
    <MasterFormDialog
      title={mode === "add" ? "เพิ่มกลุ่มวิชา" : "แก้ไขกลุ่มวิชา"}
      description="กลุ่มสาขาวิชาและคณาจารย์ผู้รับผิดชอบ"
      onClose={onClose}
      onSubmit={handleSave}
    >
      <FormField label="ชื่อกลุ่มวิชา" htmlFor="group-name" error={nameError} required>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (nameError) setNameError(undefined)
          }}
          placeholder="เช่น วิทยาการคอมพิวเตอร์"
        />
      </FormField>
      <FormField label="คณาจารย์ผู้รับผิดชอบ (เลือกได้หลายคน)" htmlFor="group-managers">
        <ManagerSelect
          id="group-managers"
          options={managerOptions}
          selectedValues={selectedManagers}
          onChange={setSelectedManagers}
          placeholder="เลือกคณาจารย์ผู้รับผิดชอบ..."
        />
      </FormField>
      <StatusField value={status} onChange={setStatus} options={MASTER_STATUS_BASIC} />
    </MasterFormDialog>
  )
}
