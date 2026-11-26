"use client"

import { useState } from "react"
import { FormField } from "@/components/common/form-field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MasterFormDialog } from "@/components/master/form-dialog"

export interface RoleItem {
  id: string
  name: string
  description: string | null
  permissions: string[]
  created_at: string
}

export interface RoleFormValues {
  id: string
  name: string
  description: string
  permissions: string[]
}

export const RESOURCES = [
  {
    key: "courses",
    label: "รายวิชา (Courses)",
    actions: [
      { id: "courses:view", label: "ดู" },
      { id: "courses:create", label: "สร้าง" },
      { id: "courses:edit", label: "แก้ไข" },
      { id: "courses:delete", label: "ลบ" },
    ],
  },
  {
    key: "lessons",
    label: "บทเรียน (Lessons)",
    actions: [
      { id: "lessons:view", label: "ดู" },
      { id: "lessons:create", label: "สร้าง" },
      { id: "lessons:edit", label: "แก้ไข" },
      { id: "lessons:delete", label: "ลบ" },
    ],
  },
  {
    key: "submissions",
    label: "ตรวจงาน (Submissions)",
    actions: [
      { id: "submissions:view", label: "ดูงานส่ง" },
      { id: "submissions:grade", label: "ตรวจ/ให้คะแนน" },
    ],
  },
  { key: "reports", label: "รายงาน (Reports)", actions: [{ id: "reports:view", label: "ดู/ส่งออกรายงาน" }] },
  { key: "master", label: "ข้อมูลหลัก (Master Data)", actions: [{ id: "master:manage", label: "จัดการทั้งหมด" }] },
  {
    key: "users",
    label: "ผู้ใช้งานและสิทธิ์ (Users/Roles)",
    actions: [
      { id: "users:manage", label: "จัดการทั้งหมด" },
      { id: "users:impersonate", label: "ดูมุมมองผู้ใช้ (Impersonate)" },
    ],
  },
  { key: "broadcasts", label: "ประกาศ (Broadcasts)", actions: [{ id: "broadcasts:manage", label: "สร้าง/แก้ไข/ลบประกาศ" }] },
]

export function RoleDialog({
  mode,
  row,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row: RoleItem | null
  onClose: () => void
  onSave: (data: RoleFormValues) => void
}) {
  const [id, setId] = useState(row ? row.id : "")
  const [name, setName] = useState(row ? row.name : "")
  const [description, setDescription] = useState(row ? row.description || "" : "")
  const [permissions, setPermissions] = useState<string[]>(row ? row.permissions || [] : [])
  const [errors, setErrors] = useState<{ id?: string; name?: string }>({})

  const clearError = (key: "id" | "name") => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const handleSave = () => {
    const next: { id?: string; name?: string } = {}
    if (!id.trim()) next.id = "กรุณากรอกรหัส Role (ID)"
    if (!name.trim()) next.name = "กรุณากรอกชื่อ Role"
    if (Object.keys(next).length > 0) {
      setErrors(next)
      document.getElementById(next.id ? "role-id" : "role-name")?.focus()
      return
    }
    onSave({ id: mode === "add" ? id.toLowerCase().replace(/[^a-z0-9_]/g, "") : id, name, description, permissions })
  }

  const togglePermission = (permId: string, on: boolean) =>
    setPermissions((prev) => (on ? [...prev, permId] : prev.filter((p) => p !== permId)))

  return (
    <MasterFormDialog
      title={mode === "add" ? "สร้าง Role ใหม่" : "แก้ไขข้อมูล Role"}
      description="กำหนดชื่อ Role และเลือกสิทธิ์การเข้าถึงเมนูต่างๆ"
      onClose={onClose}
      onSubmit={handleSave}
      className="sm:max-w-2xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="รหัส Role (ID)" htmlFor="role-id" error={errors.id} required>
          <Input
            id="role-id"
            value={id}
            onChange={(e) => {
              setId(e.target.value)
              clearError("id")
            }}
            placeholder="เช่น ta, editor"
            disabled={mode === "edit"}
          />
        </FormField>
        <FormField label="ชื่อ Role" htmlFor="role-name" error={errors.name} required>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clearError("name")
            }}
            placeholder="เช่น ผู้ช่วยสอน"
          />
        </FormField>
      </div>
      <FormField label="รายละเอียด" htmlFor="role-desc">
        <Input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="อธิบายหน้าที่ของ Role นี้" />
      </FormField>
      <div className="grid gap-2">
        <span className="text-sm font-medium">กำหนดสิทธิ์แยกตามประเภทการใช้งาน (Permissions Grid)</span>
        <div className="max-h-80 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เมนู / ทรัพยากร</TableHead>
                <TableHead>การจัดการสิทธิ์การเข้าถึง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RESOURCES.map((res) => (
                <TableRow key={res.key}>
                  <TableCell className="w-56 whitespace-normal font-medium">{res.label}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {res.actions.map((act) => (
                        <div key={act.id} className="flex items-center gap-2">
                          <Checkbox id={`perm-${act.id}`} checked={permissions.includes(act.id)} onCheckedChange={(c) => togglePermission(act.id, c === true)} />
                          <Label htmlFor={`perm-${act.id}`} className="font-normal">
                            {act.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MasterFormDialog>
  )
}
