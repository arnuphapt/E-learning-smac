"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDataTable } from "./context"

export type DataTableTabOption = {
  label: string
  value: string | undefined
  count?: number
}

/** Underline tab strip inside `<DataTable.Root>` that filters a column (`value: undefined` clears the filter). */
export function Tabs({
  column,
  options,
  className,
}: {
  column: string
  options: readonly DataTableTabOption[]
  className?: string
}) {
  const table = useDataTable()
  const col = table.getColumn(column)
  const current = col?.getFilterValue() as string | undefined

  return (
    <div
      role="tablist"
      aria-label="ตัวกรองสถานะ"
      className={cn("flex items-center gap-1 overflow-x-auto border-b border-border/60 px-4 sm:px-5", className)}
    >
      {options.map((opt) => {
        const active = opt.value === undefined ? current === undefined : current === opt.value
        return (
          <Button
            key={opt.label}
            type="button"
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={active}
            onClick={() => col?.setFilterValue(opt.value)}
            className={cn(
              "relative h-10 shrink-0 rounded-none px-3 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-foreground",
              active && "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary",
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {opt.count}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
