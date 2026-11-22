"use client"

import type { ReactNode } from "react"
import { FormField } from "@/components/common/form-field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BankCourseRow, BankLessonRow } from "./bank-data"

const ALL = "__all__" // Radix SelectItem cannot have value ""

function FilterSelect({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <FormField label={label} htmlFor={id} className="min-w-48 flex-1">
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>ทั้งหมด</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </FormField>
  )
}

/** Set / lesson / topic selects and the question search of the standalone bank page. "" = ทั้งหมด. */
export function BankFilters({
  sets,
  lessons,
  topics,
  setId,
  lessonId,
  topic,
  q,
  onSet,
  onLesson,
  onTopic,
  onQ,
}: {
  sets: BankCourseRow[]
  lessons: BankLessonRow[]
  topics: string[]
  setId: string
  lessonId: string
  topic: string
  q: string
  onSet: (v: string) => void
  onLesson: (v: string) => void
  onTopic: (v: string) => void
  onQ: (v: string) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-3 rounded-lg border bg-card p-4">
      <FilterSelect id="bank-set" label="ชุดติว" value={setId} onChange={onSet}>
        {sets.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.code} {c.title}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect id="bank-lesson" label="บทเรียน" value={lessonId} onChange={onLesson}>
        {lessons.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            บทที่ {l.index} {l.title}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect id="bank-topic" label="หัวข้อ" value={topic} onChange={onTopic}>
        {topics.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </FilterSelect>
      <FormField label="ค้นหาในโจทย์" htmlFor="bank-search" className="min-w-64 flex-[2]">
        <Input id="bank-search" value={q} onChange={(e) => onQ(e.target.value)} placeholder="พิมพ์คำที่อยู่ในโจทย์…" />
      </FormField>
    </div>
  )
}
