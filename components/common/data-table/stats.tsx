"use client"

import { cn } from "@/lib/utils"

export type StatTone = "primary" | "success" | "warning" | "destructive" | "info" | "amber"

export type DataTableStatItem = {
  label: string
  value: string | number
  tone?: StatTone
  hint?: string
}

const dotClass: Record<StatTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  amber: "bg-amber-accent",
}

const gridCols: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
}

/** Optional summary strip rendered inside `<DataTable.Root>` above the toolbar. */
export function Stats({ items, className }: { items: readonly DataTableStatItem[]; className?: string }) {
  if (items.length === 0) return null
  const cols = gridCols[Math.min(items.length, 4)] ?? "sm:grid-cols-4"

  return (
    <div className={cn("grid grid-cols-2 divide-x divide-y divide-border/60 border-b border-border/60 sm:divide-y-0", cols, className)}>
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {item.tone && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dotClass[item.tone])} />}
            <span className="truncate">{item.label}</span>
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight text-foreground tabular-nums">{item.value}</div>
          {item.hint && <div className="mt-0.5 text-xs text-muted-foreground">{item.hint}</div>}
        </div>
      ))}
    </div>
  )
}
