"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { formatThaiDate, parseThaiDateToISO } from "@/lib/thai-date"
import { DatePicker } from "@/components/common/date-picker"
import { FormField } from "@/components/common/form-field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MasterFormDialog } from "@/components/master/form-dialog"
import { StatusField } from "@/components/master/status"
import type { AcademicYearRow } from "@/components/master/years/year-dialog"

export type TermRow = Database["public"]["Tables"]["terms"]["Row"]

export interface TermSaveInput {
  name: string
  year: string
  start_date: string
  end_date: string
  status: string
}

export function TermDialog({
  mode,
  row,
  academicYears,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row?: TermRow
  academicYears: AcademicYearRow[]
  onClose: () => void
  onSave: (data: TermSaveInput) => void
}) {
  const [name, setName] = useState(row ? row.name || "" : "ภาคเรียนที่ 1")
  const [year, setYear] = useState(row ? String(row.year) : academicYears[0]?.year || "")
  const [startDate, setStartDate] = useState(row ? parseThaiDateToISO(row.start_date) : "")
  const [endDate, setEndDate] = useState(row ? parseThaiDateToISO(row.end_date) : "")
  const [status, setStatus] = useState(row ? row.status || "upcoming" : "upcoming")

  const handleSave = () => {
    if (!year) {
      toast.error("กรุณาเลือกปีการศึกษา")
      return
    }
    onSave({ name, year, start_date: formatThaiDate(startDate), end_date: formatThaiDate(endDate), status })
  }

  return (
    <MasterFormDialog
      title={mode === "add" ? "เพิ่มภาคเรียน" : "แก้ไขภาคเรียน"}
      description="ภาคการศึกษาภายใต้แต่ละปีการศึกษา"
      onClose={onClose}
      onSubmit={handleSave}
    >
      <FormField label="ชื่อภาคเรียน" htmlFor="term-name" required>
        <Input id="term-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ภาคเรียนที่ 1" />
      </FormField>
      <FormField label="ปีการศึกษา" htmlFor="term-year" required>
        {academicYears.length > 0 ? (
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger id="term-year" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((ay) => (
                <SelectItem key={ay.id} value={String(ay.year)}>
                  ปีการศึกษา {ay.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select disabled>
            <SelectTrigger id="term-year" className="w-full">
              <SelectValue placeholder="— ยังไม่มีปีการศึกษา กรุณาเพิ่มก่อน —" />
            </SelectTrigger>
          </Select>
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="วันเริ่มต้น" htmlFor="term-start">
          <DatePicker id="term-start" value={startDate} onChange={setStartDate} clearable />
        </FormField>
        <FormField label="วันสิ้นสุด" htmlFor="term-end">
          <DatePicker id="term-end" value={endDate} onChange={setEndDate} clearable />
        </FormField>
      </div>
      <StatusField value={status} onChange={setStatus} />
    </MasterFormDialog>
  )
}
