"use client"

import { useState } from "react"
import { FormField } from "@/components/common/form-field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MasterFormDialog } from "@/components/master/form-dialog"
import { MASTER_STATUS_BASIC, StatusField } from "@/components/master/status"

export interface SectionItem {
  id: string
  name: string | null
  students: number | null
  status: string | null
  range_start: string | null
  range_end: string | null
  year_level: string | null
  group_name?: string | null
}

export interface SectionSaveInput {
  name: string
  students: number
  status: string
  range_start: string | null
  range_end: string | null
  year_level: string | null
}

// Radix Select forbids an empty item value, so "no year level" travels as this sentinel.
const NO_LEVEL = "__none__"

export function SectionDialog({
  mode,
  row,
  availableYears,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row?: SectionItem
  availableYears: string[]
  onClose: () => void
  onSave: (data: SectionSaveInput) => void
}) {
  const [name, setName] = useState(row ? row.name || "" : "")
  const [status, setStatus] = useState(row ? row.status || "active" : "active")
  const [rangeStart, setRangeStart] = useState(row ? row.range_start || "" : "")
  const [rangeEnd, setRangeEnd] = useState(row ? row.range_end || "" : "")
  const [yearLevel, setYearLevel] = useState(row ? row.year_level || "" : "")
  const [errors, setErrors] = useState<{ name?: string; rangeStart?: string; rangeEnd?: string }>({})

  const clearError = (key: "name" | "rangeStart" | "rangeEnd") => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const handleSave = () => {
    const next: { name?: string; rangeStart?: string; rangeEnd?: string } = {}
    if (!name.trim()) next.name = "กรุณากรอกชื่อ Section"
    if (rangeStart && !rangeEnd) next.rangeEnd = "กรุณาระบุรหัสสิ้นสุด"
    else if (!rangeStart && rangeEnd) next.rangeStart = "กรุณาระบุรหัสเริ่มต้น"
    else if (rangeStart && rangeEnd) {
      if (rangeStart.length !== 3) next.rangeStart = "รหัสนักศึกษาช่วงเริ่มต้นต้องมี 3 หลัก"
      if (rangeEnd.length !== 3) next.rangeEnd = "รหัสนักศึกษาช่วงสิ้นสุดต้องมี 3 หลัก"
      if (rangeStart.length === 3 && rangeEnd.length === 3 && parseInt(rangeStart, 10) > parseInt(rangeEnd, 10)) {
        next.rangeStart = "รหัสเริ่มต้นต้องไม่มากกว่ารหัสสิ้นสุด"
      }
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      const firstId = next.name ? "section-name" : next.rangeStart ? "section-start" : "section-end"
      document.getElementById(firstId)?.focus()
      return
    }
    onSave({
      name,
      students: row ? row.students || 0 : 0,
      status,
      range_start: rangeStart || null,
      range_end: rangeEnd || null,
      year_level: yearLevel || null,
    })
  }

  return (
    <MasterFormDialog
      title={mode === "add" ? "เพิ่ม Section" : "แก้ไข Section"}
      description="กลุ่มเรียนของนักศึกษาในระบบ"
      onClose={onClose}
      onSubmit={handleSave}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="ชื่อ Section" htmlFor="section-name" error={errors.name} required>
          <Input
            id="section-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clearError("name")
            }}
            placeholder="เช่น Sec 1, Sec A"
          />
        </FormField>
        <FormField label="ชั้นปี (ไม่ระบุได้)" htmlFor="section-level">
          <Select value={yearLevel || NO_LEVEL} onValueChange={(v) => setYearLevel(v === NO_LEVEL ? "" : v)}>
            <SelectTrigger id="section-level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEVEL}>ไม่ระบุชั้นปี</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="ช่วงรหัสเริ่มต้น (3 หลักท้าย)" htmlFor="section-start" error={errors.rangeStart}>
          <Input
            id="section-start"
            className="text-center"
            value={rangeStart}
            maxLength={3}
            inputMode="numeric"
            onChange={(e) => {
              setRangeStart(e.target.value.replace(/\D/g, ""))
              clearError("rangeStart")
              clearError("rangeEnd")
            }}
            placeholder="เช่น 001"
          />
        </FormField>
        <FormField label="ช่วงรหัสสิ้นสุด (3 หลักท้าย)" htmlFor="section-end" error={errors.rangeEnd}>
          <Input
            id="section-end"
            className="text-center"
            value={rangeEnd}
            maxLength={3}
            inputMode="numeric"
            onChange={(e) => {
              setRangeEnd(e.target.value.replace(/\D/g, ""))
              clearError("rangeStart")
              clearError("rangeEnd")
            }}
            placeholder="เช่น 099"
          />
        </FormField>
      </div>
      <StatusField value={status} onChange={setStatus} options={MASTER_STATUS_BASIC} />
    </MasterFormDialog>
  )
}
