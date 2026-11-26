"use client"

import type { ReactNode } from "react"
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDataTable } from "./context"

/** Sortable header: use as `header: ({ column }) => <ColumnHeader column={column} title="ชื่อ" />`. */
export function ColumnHeader({ column, title }: { column: { id: string }; title: ReactNode }) {
  const col = useDataTable().getColumn(column.id)
  if (!col || !col.getCanSort()) return <span>{title}</span>
  const sorted = col.getIsSorted()
  const Icon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ChevronsUpDownIcon
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2.5 h-8 font-medium text-muted-foreground hover:text-foreground", sorted && "text-foreground")}
      onClick={col.getToggleSortingHandler()}
    >
      {title}
      <Icon className={cn("size-3.5", sorted ? "text-foreground" : "opacity-50")} aria-hidden />
    </Button>
  )
}
