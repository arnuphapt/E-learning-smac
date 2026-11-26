"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

/** Two-select time picker (00–23 / 00–59) backed by an "HH:MM" string. */
export function TimePicker({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const [rawH = "00", rawM = "00"] = (value || "").split(":")
  const paddedH = rawH.padStart(2, "0")
  const paddedM = rawM.padStart(2, "0")
  const hour = HOURS.includes(paddedH) ? paddedH : "00"
  const minute = MINUTES.includes(paddedM) ? paddedM : "00"

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select value={hour} onValueChange={(h) => onChange(`${h}:${minute}`)} disabled={disabled}>
        <SelectTrigger id={id} aria-label="ชั่วโมง" className="min-w-16 flex-1 tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h} className="tabular-nums">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span aria-hidden className="text-sm font-medium text-muted-foreground">
        :
      </span>
      <Select value={minute} onValueChange={(m) => onChange(`${hour}:${m}`)} disabled={disabled}>
        <SelectTrigger aria-label="นาที" className="min-w-16 flex-1 tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m} className="tabular-nums">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
