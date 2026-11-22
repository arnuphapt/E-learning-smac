"use client"

import { InfoIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** "ชั้นปีที่เข้าถึงได้": one toggle chip per master year label. Nothing checked = every year. */
export function YearLevelPicker({
  labels,
  isChecked,
  onToggle,
  anyChecked,
}: {
  labels: string[]
  isChecked: (label: string) => boolean
  onToggle: (label: string) => void
  anyChecked: boolean
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">
        ชั้นปีที่เข้าถึงได้ <span className="font-normal text-muted-foreground">(ไม่เลือก = ทุกชั้นปี)</span>
      </legend>
      <div className="flex flex-wrap items-center gap-3">
        {labels.length === 0 ? (
          <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูลชั้นปี... หรือไม่มีข้อมูลชั้นปีในระบบ</span>
        ) : (
          labels.map((label) => {
            const checked = isChecked(label)
            const inputId = "year-level-" + String(label).replace(/\s+/g, "-")
            return (
              <Label
                key={label}
                htmlFor={inputId}
                className={cn("min-h-10 cursor-pointer rounded-lg border px-3.5 py-2", checked ? "border-primary bg-primary-soft font-bold text-primary-soft-foreground" : "font-normal")}
              >
                <Checkbox id={inputId} checked={checked} onCheckedChange={() => onToggle(label)} />
                {label}
              </Label>
            )
          })
        )}
      </div>
      {!anyChecked && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <InfoIcon className="size-3.5" />
          นักศึกษาทุกชั้นปีจะมองเห็นรายวิชานี้
        </p>
      )}
    </fieldset>
  )
}
