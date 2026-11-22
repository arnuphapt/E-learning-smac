"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { MultiSelect } from "@/components/common/multi-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { CourseRow, InstructorOption, SectionRow } from "./detail"
import { toYearNumbers } from "./detail"
import { SectionSelect } from "./section-select"
import { YearLevelPicker } from "./year-level-picker"

export type CourseEditValues = {
  title: string
  managerIds: string[]
  yearLevels: Array<string | number>
  section: string
}

const sortedJson = (list: unknown[]) => JSON.stringify(list)

/** "แก้ไขข้อมูลรายวิชา" card of the settings tab. Owns the form state, starts from the loaded course. */
export function CourseEditCard({
  course,
  allInstructors,
  initialManagerIds,
  yearLabels,
  sections,
  onSave,
}: {
  course: CourseRow
  allInstructors: InstructorOption[]
  /** Main managers resolved from `course.instructor` (or the group's course manager). */
  initialManagerIds: string[]
  yearLabels: string[]
  sections: SectionRow[]
  onSave: (values: CourseEditValues) => Promise<void>
}) {
  const [title, setTitle] = useState(course.title || "")
  const [managerIds, setManagerIds] = useState(initialManagerIds)
  const [yearLevels, setYearLevels] = useState<Array<string | number>>(() => (course.year_level || []).map((y) => (typeof y === "number" || !isNaN(Number(y)) ? `ชั้นปีที่ ${y}` : y)))
  const [section, setSection] = useState(course.section || "")
  const [saving, setSaving] = useState(false)

  const isChecked = (label: string) => {
    const n = parseInt(label.replace(/\D/g, ""))
    return yearLevels.includes(label) || (!isNaN(n) && yearLevels.includes(n)) || yearLevels.includes(String(n))
  }
  const toggleYear = (label: string) => {
    const n = parseInt(label.replace(/\D/g, ""))
    setYearLevels((prev) => (isChecked(label) ? prev.filter((y) => y !== label && (!isNaN(n) ? String(y) !== String(n) : true)) : [...prev, label].sort()))
  }

  const unchanged =
    title === course.title &&
    sortedJson(toYearNumbers(yearLevels).sort()) === sortedJson((course.year_level || []).map((y) => Number(y)).filter(Boolean).sort()) &&
    sortedJson(managerIds) === sortedJson(allInstructors.filter((u) => course.instructor?.split(", ").includes(u.name)).map((u) => u.id)) &&
    section === course.section

  const save = async () => {
    setSaving(true)
    try {
      await onSave({ title, managerIds, yearLevels, section })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>แก้ไขข้อมูลรายวิชา</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FormField label="ชื่อรายวิชา" htmlFor="edit-course-title">
          <Input id="edit-course-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น การพยาบาลผู้ใหญ่ 1" />
        </FormField>
        <FormField label="อาจารย์ผู้รับผิดชอบหลัก" htmlFor="edit-course-managers" required>
          <MultiSelect
            id="edit-course-managers"
            options={allInstructors.map((u) => ({ value: u.id, label: u.name, description: u.email ?? undefined }))}
            selectedValues={managerIds}
            onChange={setManagerIds}
            placeholder="เลือกอาจารย์ผู้รับผิดชอบหลัก..."
            searchPlaceholder="ค้นหาคณาจารย์…"
            emptyText="ไม่มีข้อมูล"
            unit="คน"
          />
        </FormField>
        <YearLevelPicker labels={yearLabels} isChecked={isChecked} onToggle={toggleYear} anyChecked={yearLevels.length > 0} />
        {course.kind === "tutor" && <Badge variant="secondary">ชุดติว</Badge>}
        <FormField label="กลุ่มเรียน / Section" htmlFor="edit-course-section">
          <SectionSelect id="edit-course-section" value={section} onChange={setSection} sections={sections} />
        </FormField>
        <div className="flex justify-end">
          <Button disabled={saving || unchanged} onClick={save}>
            {saving ? <Spinner /> : <CheckIcon />}
            {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
