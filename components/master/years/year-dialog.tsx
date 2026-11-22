"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { formatThaiDate, parseThaiDateToISO } from "@/lib/thai-date"
import { FormField } from "@/components/common/form-field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MasterFormDialog } from "@/components/master/form-dialog"
import { StatusField } from "@/components/master/status"

export type AcademicYearRow = Database["public"]["Tables"]["academic_years"]["Row"]

export interface YearSaveInput {
  year: string
  label: string
  start_date: string
  end_date: string
  status: string
  courses: number
}

export function YearDialog({
  mode,
  row,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row?: AcademicYearRow
  onClose: () => void
  onSave: (data: YearSaveInput) => void
}) {
  const currentBE = new Date().getFullYear() + 543
  const [year, setYear] = useState(row ? row.year || String(currentBE) : String(currentBE))
  const [status, setStatus] = useState(row ? row.status || "upcoming" : "upcoming")
  const [startDate, setStartDate] = useState(row ? parseThaiDateToISO(row.start_date) : "")
  const [endDate, setEndDate] = useState(row ? parseThaiDateToISO(row.end_date) : "")

  const yearsOptions: number[] = []
  for (let i = currentBE - 5; i <= currentBE + 5; i++) yearsOptions.push(i)

  const handleSave = () => {
    if (!year) {
      toast.error("กรุณาเลือกปีการศึกษา")
      return
    }
    onSave({
      year,
      label: `ปีการศึกษา ${year}`,
      start_date: formatThaiDate(startDate),
      end_date: formatThaiDate(endDate),
      status,
      courses: row ? row.courses || 0 : 0,
    })
  }

  return (
    <MasterFormDialog
      title={mode === "add" ? "เพิ่มปีการศึกษา" : "แก้ไขปีการศึกษา"}
      description="กำหนดปีการศึกษาและช่วงเวลาเปิด-ปิด"
      onClose={onClose}
      onSubmit={handleSave}
    >
      <FormField label="ปีการศึกษา (พ.ศ.)" htmlFor="year-year" required>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger id="year-year" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearsOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="วันเริ่มต้น" htmlFor="year-start">
          <Input id="year-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>
        <FormField label="วันสิ้นสุด" htmlFor="year-end">
          <Input id="year-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </FormField>
      </div>
      <StatusField value={status} onChange={setStatus} />
    </MasterFormDialog>
  )
}
