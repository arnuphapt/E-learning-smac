/* eslint-disable @typescript-eslint/no-explicit-any -- row type is checked at the call site */
"use client"

import { Fragment, type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDataTable } from "./context"

export function Content({
  empty,
  loading = false,
  skeletonRows = 5,
  subRow,
}: {
  /** Shown when there are no rows (nothing loaded, or the filters match nothing). */
  empty?: ReactNode
  loading?: boolean
  skeletonRows?: number
  /** Extra full-width row under a data row (e.g. expanded detail). Return null for none. */
  subRow?: (original: any) => ReactNode
}) {
  const table = useDataTable()
  const rows = table.getRowModel().rows
  const colCount = table.getAllLeafColumns().length || 1

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
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
              <TableRow key={i}>
                {Array.from({ length: colCount }, (_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="py-10 text-center text-muted-foreground">
                {empty ?? "ไม่มีข้อมูลแสดงในตาราง"}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const sub = subRow?.(row.original)
              return (
                <Fragment key={row.id}>
                  <TableRow>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                  {sub && (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={colCount}>{sub}</TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
