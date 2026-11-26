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
  const selectedLabels = labels.filter(isChecked)

  return (
    <fieldset className="grid gap-3 rounded-xl border border-border/80 bg-muted/25 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <legend className="text-sm font-medium text-foreground">ชั้นปีที่เข้าถึงได้</legend>
        <span className="text-xs text-muted-foreground">{anyChecked ? "เลือกจำกัดเฉพาะบางชั้นปี" : "ไม่เลือก = ทุกชั้นปี"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
                className={cn(
                  "min-h-9 cursor-pointer rounded-lg border bg-card px-3 py-1.5 text-sm transition-colors",
                  checked
                    ? "border-primary bg-primary-soft/60 font-semibold text-primary-soft-foreground shadow-xs"
                    : "border-border font-normal text-foreground hover:border-primary/40 hover:bg-card",
                )}
              >
                <Checkbox id={inputId} checked={checked} onCheckedChange={() => onToggle(label)} />
                {label}
              </Label>
            )
          })
        )}
      </div>
      {!anyChecked ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <InfoIcon className="size-3.5 shrink-0 text-primary" />
          นักศึกษาทุกชั้นปีจะมองเห็นรายวิชานี้
        </p>
      ) : (
        <p className="text-xs font-medium text-primary">
          เปิดให้เข้าถึงเฉพาะ: {selectedLabels.join(", ")}
        </p>
      )}
    </fieldset>
  )
}
