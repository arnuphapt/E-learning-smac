"use client"

import { CheckIcon, PaletteIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { COURSE_COLORS } from "./draft"

/** "สีปกรายวิชา" card: preset swatches plus a custom colour picker. Swatch colours are the course's data, so they are inline. */
export function CourseColorCard({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const custom = !COURSE_COLORS.includes(color)
  return (
    <Card>
      <CardHeader>
        <CardTitle>สีปกรายวิชา</CardTitle>
        <CardDescription>ใช้แสดงบนการ์ดรายวิชาและหัวบทเรียน</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {COURSE_COLORS.map((c) => (
          <Toggle
            key={c}
            pressed={color === c}
            onPressedChange={() => onChange(c)}
            aria-label={`เลือกสี ${c}`}
            className="size-11 rounded-xl border-2 border-transparent text-white hover:text-white data-[state=on]:border-foreground data-[state=on]:text-white"
            style={{ backgroundColor: c }}
          >
            {color === c && <CheckIcon />}
          </Toggle>
        ))}
        <Label
          htmlFor="course-color-picker"
          title="เลือกสีเอง"
          className="relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed text-muted-foreground"
          style={custom ? { backgroundColor: color } : undefined}
        >
          {custom ? <CheckIcon className="size-4 text-white" /> : <PaletteIcon className="size-4" />}
          <Input
            id="course-color-picker"
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            aria-label="เลือกสีปกรายวิชาเอง"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </Label>
      </CardContent>
    </Card>
  )
}
