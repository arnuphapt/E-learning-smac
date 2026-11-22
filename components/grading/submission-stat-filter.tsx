"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SubmissionFilter = "all" | "submitted" | "graded" | "not-submitted"

/** Four count tiles that double as the status filter. */
export function SubmissionStatFilter({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: SubmissionFilter; label: string; count: number; icon: ReactNode }>
  value: SubmissionFilter
  onChange: (key: SubmissionFilter) => void
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => {
        const active = value === s.key
        return (
          <Button
            key={s.key}
            variant="outline"
            aria-pressed={active}
            onClick={() => onChange(s.key)}
            className={cn("h-auto justify-start gap-3 rounded-xl bg-card px-6 py-5 text-left font-normal", active && "border-primary ring-[3px] ring-primary/10")}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{s.icon}</span>
            <span>
              <span className="block text-2xl font-bold leading-none tabular-nums">{s.count}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{s.label}</span>
            </span>
          </Button>
        )
      })}
    </div>
  )
}
