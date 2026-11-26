/* eslint-disable @typescript-eslint/no-explicit-any -- row type is checked at the call site */
"use client"

import { Fragment, type ReactNode } from "react"
import { EmptyState } from "@/components/common/states"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDataTable } from "./context"

export function Content({
  empty,
  loading = false,
  skeletonRows = 5,
  subRow,
  onRowClick,
}: {
  /** Shown when there are no rows (nothing loaded, or the filters match nothing). */
  empty?: ReactNode
  loading?: boolean
  skeletonRows?: number
  /** Extra full-width row under a data row (e.g. expanded detail). Return null for none. */
  subRow?: (original: any) => ReactNode
  /** Optional click handler for each data row. */
  onRowClick?: (original: any) => void
}) {
  const table = useDataTable()
  const rows = table.getRowModel().rows
  const colCount = table.getAllLeafColumns().length || 1

  return (
    <Table>
      <TableHeader className="bg-muted/60 [&_tr]:border-b [&_tr]:border-border/60">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                colSpan={header.colSpan}
                className="h-11 px-4 text-xs font-medium text-muted-foreground sm:text-sm"
                aria-sort={
                  header.column.getIsSorted() === "asc"
                    ? "ascending"
                    : header.column.getIsSorted() === "desc"
                      ? "descending"
                      : undefined
                }
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: skeletonRows }, (_, i) => (
            <TableRow key={i} className="border-b border-border/60 last:border-b-0">
              {Array.from({ length: colCount }, (_, j) => (
                <TableCell key={j} className="px-4 py-3.5">
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colCount} className="p-6 text-center text-muted-foreground">
              {empty ?? <EmptyState title="ไม่มีข้อมูลแสดงในตาราง" />}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const sub = subRow?.(row.original)
            return (
              <Fragment key={row.id}>
                <TableRow
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onRowClick(row.original)
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={
                    onRowClick
                      ? "cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      : "border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/40"
                  }
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3.5 text-sm">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
                {sub && (
                  <TableRow className="border-b border-border/60 bg-muted/40 last:border-b-0 hover:bg-muted/40">
                    <TableCell colSpan={colCount} className="px-4 py-3.5">
                      {sub}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
