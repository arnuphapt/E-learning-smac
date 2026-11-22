"use client"

import type { ReactNode } from "react"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useDataTable } from "./context"

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-3 pb-4", className)}>{children}</div>
}

export function Search({ placeholder = "ค้นหาข้อมูล…", className }: { placeholder?: string; className?: string }) {
  const table = useDataTable()
  const value = (table.state.globalFilter as string | undefined) ?? ""
  return (
    <div className={cn("relative min-w-60 flex-1", className)}>
      <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => table.setGlobalFilter(e.target.value || undefined)}
        className="pl-9"
      />
    </div>
  )
}

export type FilterOption = { value: string; label: string }

const ALL = "__all__"

/** Single-select filter on one column; compares String(cell) to the option value. */
export function Filter({
  column,
  options,
  allLabel = "ทั้งหมด",
  placeholder,
  className,
}: {
  column: string
  options: readonly FilterOption[]
  allLabel?: string
  placeholder?: string
  className?: string
}) {
  const table = useDataTable()
  const col = table.getColumn(column)
  const current = (col?.getFilterValue() as string | undefined) ?? ALL
  return (
    <Select value={current} onValueChange={(v) => col?.setFilterValue(v === ALL ? undefined : v)}>
      <SelectTrigger aria-label={placeholder ?? allLabel} className={cn("w-44", className)}>
        <SelectValue placeholder={placeholder ?? allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function Actions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("ml-auto flex items-center gap-2", className)}>{children}</div>
}
