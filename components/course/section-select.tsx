"use client"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SectionRow } from "./draft"

const NONE = "__none__"

/** Section picker grouped by year level; "" = ไม่ระบุ Section. `id` goes on the trigger for the FormField label. */
export function SectionSelect({ id, value, onChange, sections }: { id: string; value: string; onChange: (value: string) => void; sections: SectionRow[] }) {
  const sectionsByYear = Object.entries(
    sections.reduce<Record<string, SectionRow[]>>((acc, s) => {
      const y = s.year_level || "ไม่ระบุชั้นปี"
      if (!acc[y]) acc[y] = []
      acc[y].push(s)
      return acc
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b, "th"))

  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} className="w-full">
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
  )
}
