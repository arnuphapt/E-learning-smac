"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { FormField } from "@/components/common/form-field"
import { MultiSelect } from "@/components/common/multi-select"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MasterFormDialog } from "@/components/master/form-dialog"

export type RoleSummary = Pick<Database["public"]["Tables"]["roles"]["Row"], "id" | "name">
export type SectionSummary = Pick<Database["public"]["Tables"]["sections"]["Row"], "id" | "name">
export type SubjectGroupRow = Database["public"]["Tables"]["subject_groups"]["Row"]

export interface UserItem {
  id: string
  name: string
  email: string | null
  role: string | null
  student_no: string | null
  section: string | null
  group_id: string | null
  created_at?: string | null
  study_year?: number | null
  studentId: string | null
  sec: string | null
  status: string
}

export interface UserSaveInput {
  name: string
  email: string
  role: string
  studentId: string
  sec: string | null
  groupId: string | null
  status: string
}

const NO_GROUP = "__none__"

export function UserDialog({
  mode,
  row,
  rolesList,
  subjectGroups,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row?: UserItem
  rolesList: RoleSummary[]
  subjectGroups: SubjectGroupRow[]
  onClose: () => void
  onSave: (userData: UserSaveInput) => void
}) {
  const [name, setName] = useState(row ? row.name : "")
  const [email, setEmail] = useState(row ? row.email || "" : "")
  const [selectedRoles, setSelectedRoles] = useState<string[]>(row && row.role ? row.role.split(",").map((r) => r.trim()) : ["student"])
  const [studentId, setStudentId] = useState(row ? (row.role?.split(",")[0] === "student" ? row.studentId || "" : "") : "")
  const [sec] = useState<string | null>(row ? row.sec : "ไม่มี")
  const [status, setStatus] = useState(row ? row.status : "active")
  const [groupId, setGroupId] = useState(row ? (row.group_id ?? "") : "")

  const isStudent = selectedRoles.includes("student")

  const handleSave = () => {
    if (!name || !email) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน")
      return
    }
    onSave({
      name,
      email,
      role: selectedRoles.join(","),
      studentId: isStudent ? studentId : "อาจารย์ผู้สอน",
      sec: isStudent ? sec : "ไม่มี",
      groupId: !isStudent ? groupId : null,
      status,
    })
  }

  return (
    <MasterFormDialog
      title={mode === "add" ? "เพิ่มผู้ใช้งาน" : "แก้ไขข้อมูลผู้ใช้งาน"}
      description="กำหนดข้อมูลผู้ใช้งานและสิทธิ์ในระบบ"
      onClose={onClose}
      onSubmit={handleSave}
    >
      <FormField label="ชื่อ-นามสกุล" htmlFor="user-name" required>
        <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น อ. ดร. สมชาย ใจดี หรือ ณัฐชยา ยิ้มแย้ม" />
      </FormField>
      <FormField label="อีเมล" htmlFor="user-email" required>
        <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username@smnc.ac.th" />
      </FormField>
      <FormField label="บทบาท (เลือกได้หลายบทบาท)" htmlFor="user-roles">
        <MultiSelect
          id="user-roles"
          options={rolesList.map((r) => ({ value: r.id, label: r.name, description: r.id }))}
          selectedValues={selectedRoles}
          onChange={(next) => {
            if (next.length === 0) {
              toast.error("ต้องเลือกอย่างน้อย 1 บทบาท")
              return
            }
            setSelectedRoles(next)
          }}
          placeholder="เลือกบทบาท..."
          searchPlaceholder="ค้นหาบทบาท…"
          emptyText="ไม่มีบทบาท"
          unit="บทบาท"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={isStudent ? "รหัสนักศึกษา" : "ตำแหน่ง"} htmlFor="user-student-id">
          <Input
            id="user-student-id"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder={isStudent ? "เช่น 65010001" : "เช่น อาจารย์"}
          />
        </FormField>
        <FormField label="สถานะการใช้งาน" htmlFor="user-status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="user-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">ใช้งานปกติ</SelectItem>
              <SelectItem value="suspended">ระงับการใช้งาน</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      {!isStudent && (
        <FormField label="กลุ่มวิชา / สาขาวิชา" htmlFor="user-group">
          <Select value={groupId || NO_GROUP} onValueChange={(v) => setGroupId(v === NO_GROUP ? "" : v)}>
            <SelectTrigger id="user-group" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_GROUP}>ไม่ระบุกลุ่มวิชา</SelectItem>
              {subjectGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}
    </MasterFormDialog>
  )
}
