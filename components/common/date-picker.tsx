"use client"

import { useState } from "react"
import { CalendarIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function parseLocalDate(str: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim())
  if (!m) return undefined
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const date = new Date(y, mo, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return undefined
  return date
}

function formatLocalYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Date picker backed by a "YYYY-MM-DD" local-date string (no UTC drift). */
export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = "เลือกวันที่",
  clearable = false,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  clearable?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = parseLocalDate(value)

  const trigger = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 px-3 font-normal",
            !selected && "text-muted-foreground",
            clearable && selected && !disabled && "flex-1",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selected
              ? selected.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? formatLocalYMD(date) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )

  if (clearable && selected && !disabled) {
    return (
      <div className="flex items-center gap-1">
        {trigger}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          aria-label="ล้างวันที่"
          onClick={() => onChange("")}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    )
  }

  return trigger
}
