"use client"

import { FormField } from "@/components/common/form-field"
import { ManagerSelect, type UserRow } from "@/components/common/manager-select"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { CourseDraft, SectionRow, SubjectGroupRow, TermRow } from "./draft"
import { SectionSelect } from "./section-select"
import { YearLevelPicker } from "./year-level-picker"

const NONE = "__none__"

/** Grouped course form fields inside the create-course modal (flat sections, no nested card). */
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
  return (
    <div className="space-y-6">
      <section className="grid gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">ข้อมูลรายวิชา</h3>
          <p className="text-xs text-muted-foreground">ชื่อ รหัส หน่วยกิต และคำอธิบายสั้นๆ ที่จะแสดงในหน้ารายวิชา</p>
        </div>

        <FormField label="ชื่อรายวิชา" htmlFor="course-title" required>
          <Input
            id="course-title"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="เช่น การพยาบาลผู้ใหญ่ 1"
            required
            aria-required="true"
            autoFocus
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="รหัสวิชา" htmlFor="course-code" required>
            <Input
              id="course-code"
              className="font-mono"
              value={draft.code}
              onChange={(e) => onChange({ code: e.target.value })}
              placeholder="เช่น NUR301"
              required
              aria-required="true"
            />
          </FormField>
          <FormField label="หน่วยกิต" htmlFor="course-credits">
            <Input id="course-credits" value={draft.credits} onChange={(e) => onChange({ credits: e.target.value })} placeholder="เช่น 3 (2-2-5)" />
          </FormField>
        </div>

        <FormField label="คำอธิบายรายวิชา" htmlFor="course-subtitle">
          <Textarea
            id="course-subtitle"
            rows={2}
            className="min-h-20"
            value={draft.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="สรุปขอบเขตเนื้อหาและจุดเน้นของรายวิชา…"
          />
        </FormField>
      </section>

      <Separator />

      <section className="grid gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">ภาคเรียนและการจัดกลุ่ม</h3>
          <p className="text-xs text-muted-foreground">กำหนดกลุ่มวิชา ภาคเรียน และกลุ่มเรียนของรายวิชานี้</p>
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="ภาคเรียน" htmlFor="course-term" required>
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
              <SectionSelect id="course-section" value={draft.section} onChange={(v) => onChange({ section: v })} sections={sections} />
            )}
          </FormField>
        </div>
      </section>

      <Separator />

      <section className="grid gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">อาจารย์ผู้สอนและสิทธิ์การเข้าถึง</h3>
          <p className="text-xs text-muted-foreground">กำหนดอาจารย์ผู้รับผิดชอบ ผู้สอนร่วม และชั้นปีที่เข้าเรียนได้</p>
        </div>

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
          <FormField label="อาจารย์ผู้สอนร่วม (เลือกได้หลายคน)" htmlFor="course-co-instructors">
            <ManagerSelect
              id="course-co-instructors"
              options={instructors.filter((u) => !mainManagers.includes(u.id))}
              selectedValues={draft.coInstructors}
              onChange={(v) => onChange({ coInstructors: v })}
              placeholder="เลือกอาจารย์ผู้สอนร่วม..."
            />
          </FormField>
        </div>

        <YearLevelPicker
          labels={yearLabels}
          isChecked={(l) => draft.yearLevels.includes(l)}
          anyChecked={draft.yearLevels.length > 0}
          onToggle={(l) => onChange({ yearLevels: draft.yearLevels.includes(l) ? draft.yearLevels.filter((y) => y !== l) : [...draft.yearLevels, l].sort() })}
        />
      </section>
    </div>
  )
}
