"use client"

import { InfoIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { ManagerSelect, type UserRow } from "@/components/common/manager-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CourseDraft, SectionRow, SubjectGroupRow, TermRow } from "./draft"

const NONE = "__none__"

/** "ข้อมูลรายวิชา" card of the new-course form. */
export function CourseInfoCard({
  draft,
  mainManagers,
  onChange,
  groups,
  groupLocked,
  terms,
  sections,
  instructors,
  yearLabels,
}: {
  draft: CourseDraft
  /** Resolved main managers (draft value or the default). */
  mainManagers: string[]
  onChange: (patch: Partial<CourseDraft>) => void
  groups: SubjectGroupRow[]
  groupLocked: boolean
  terms: TermRow[]
  sections: SectionRow[]
  instructors: UserRow[]
  yearLabels: string[]
}) {
  const sectionsByYear = Object.entries(
    sections.reduce<Record<string, SectionRow[]>>((acc, s) => {
      const y = s.year_level || "ไม่ระบุชั้นปี"
      if (!acc[y]) acc[y] = []
      acc[y].push(s)
      return acc
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b, "th"))

  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลรายวิชา</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FormField label="ชื่อรายวิชา" htmlFor="course-title" required>
          <Input id="course-title" value={draft.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="เช่น การพยาบาลผู้ใหญ่ 1" required aria-required="true" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="รหัสวิชา" htmlFor="course-code" required>
            <Input id="course-code" value={draft.code} onChange={(e) => onChange({ code: e.target.value })} placeholder="เช่น NUR301" required aria-required="true" />
          </FormField>
          <FormField label="กลุ่มวิชา" htmlFor="course-subject-group">
            {groups.length === 0 ? (
              <Select disabled>
                <SelectTrigger id="course-subject-group" className="w-full">
                  <SelectValue placeholder="— ยังไม่มีกลุ่มวิชา กรุณาเพิ่มในระบบหลักก่อน —" />
                </SelectTrigger>
              </Select>
            ) : (
              <Select
                value={draft.subjectGroup || NONE}
                // Co-instructors are picked per group, so changing the group clears them.
                onValueChange={(v) => onChange({ subjectGroup: v === NONE ? "" : v, coInstructors: [] })}
                disabled={groupLocked}
              >
                <SelectTrigger id="course-subject-group" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>เลือกกลุ่มวิชา</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="ภาคเรียน" htmlFor="course-term">
            {terms.length === 0 ? (
              <Select disabled>
                <SelectTrigger id="course-term" className="w-full">
                  <SelectValue placeholder="(ไม่มีข้อมูลภาคเรียน - กรุณาเพิ่มในระบบหลักก่อน)" />
                </SelectTrigger>
              </Select>
            ) : (
              <Select value={draft.term} onValueChange={(v) => onChange({ term: v })}>
                <SelectTrigger id="course-term" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={`${t.name} ${t.year}`}>
                      {t.name} {t.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="กลุ่มเรียน" htmlFor="course-section">
            {sections.length === 0 ? (
              <Select disabled>
                <SelectTrigger id="course-section" className="w-full">
                  <SelectValue placeholder="— ยังไม่มี Section กรุณาเพิ่มในระบบหลักก่อน —" />
                </SelectTrigger>
              </Select>
            ) : (
              <Select value={draft.section || NONE} onValueChange={(v) => onChange({ section: v === NONE ? "" : v })}>
                <SelectTrigger id="course-section" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>ไม่ระบุ Section</SelectItem>
                  {sectionsByYear.map(([year, secs]) => (
                    <SelectGroup key={year}>
                      <SelectLabel>{year}</SelectLabel>
                      {secs.map((s) => (
                        <SelectItem key={s.id} value={s.name ?? ""}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
        <FormField label="คำอธิบายรายวิชา" htmlFor="course-subtitle">
          <Textarea id="course-subtitle" rows={3} value={draft.subtitle} onChange={(e) => onChange({ subtitle: e.target.value })} placeholder="สรุปขอบเขตเนื้อหาและจุดเน้นของรายวิชา…" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="อาจารย์ผู้รับผิดชอบหลัก" htmlFor="course-main-managers" required>
            <ManagerSelect
              id="course-main-managers"
              options={instructors.filter((u) => !draft.coInstructors.includes(u.id))}
              selectedValues={mainManagers}
              onChange={(v) => onChange({ mainManagers: v })}
              placeholder="เลือกอาจารย์ผู้รับผิดชอบหลัก..."
            />
          </FormField>
          <FormField label="หน่วยกิต" htmlFor="course-credits">
            <Input id="course-credits" value={draft.credits} onChange={(e) => onChange({ credits: e.target.value })} placeholder="เช่น 3 (2-2-5)" />
          </FormField>
        </div>
        <FormField label="อาจารย์ผู้สอนร่วม (เลือกได้หลายคน)" htmlFor="course-co-instructors">
          <ManagerSelect
            id="course-co-instructors"
            options={instructors.filter((u) => !mainManagers.includes(u.id))}
            selectedValues={draft.coInstructors}
            onChange={(v) => onChange({ coInstructors: v })}
            placeholder="เลือกอาจารย์ผู้สอนร่วม..."
          />
        </FormField>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">
            ชั้นปีที่เข้าถึงได้ <span className="font-normal text-muted-foreground">(ไม่เลือก = ทุกชั้นปี)</span>
          </legend>
          <div className="flex flex-wrap items-center gap-3">
            {yearLabels.length === 0 ? (
              <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูลชั้นปี... หรือไม่มีข้อมูลชั้นปีในระบบ</span>
            ) : (
              yearLabels.map((yrLabel) => {
                const checked = draft.yearLevels.includes(yrLabel)
                const inputId = "year-level-" + String(yrLabel).replace(/\s+/g, "-")
                return (
                  <Label
                    key={yrLabel}
                    htmlFor={inputId}
                    className={cn("min-h-10 cursor-pointer rounded-lg border px-3.5 py-2", checked ? "border-primary bg-primary-soft font-bold text-primary-soft-foreground" : "font-normal")}
                  >
                    <Checkbox
                      id={inputId}
                      checked={checked}
                      onCheckedChange={() => onChange({ yearLevels: checked ? draft.yearLevels.filter((y) => y !== yrLabel) : [...draft.yearLevels, yrLabel].sort() })}
                    />
                    {yrLabel}
                  </Label>
                )
              })
            )}
          </div>
          {draft.yearLevels.length === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <InfoIcon className="size-3.5" />
              นักศึกษาทุกชั้นปีจะมองเห็นรายวิชานี้
            </p>
          )}
        </fieldset>
      </CardContent>
    </Card>
  )
}
