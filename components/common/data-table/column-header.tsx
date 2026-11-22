"use client"

import type { ReactNode } from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDataTable } from "./context"

/** Sortable header: use as `header: ({ column }) => <ColumnHeader column={column} title="ชื่อ" />`. */
export function ColumnHeader({ column, title }: { column: { id: string }; title: ReactNode }) {
  const col = useDataTable().getColumn(column.id)
  if (!col || !col.getCanSort()) return <span>{title}</span>
  const sorted = col.getIsSorted()
  const Icon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ArrowUpDownIcon
  return (
    <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={col.getToggleSortingHandler()}>
      {title}
      <Icon className={sorted ? undefined : "opacity-40"} />
    </Button>
  )
}
