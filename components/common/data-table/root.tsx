/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack v9 types are invariant in TData; rows are typed at the call site */
"use client"

import type { ReactNode } from "react"
import { useTable } from "@tanstack/react-table"
import { DataTableProvider } from "./context"
import { dataTableFeatures, sortFn_thai, type DataTableColumnDef, type DataTableFeatures } from "./features"
import { matchesSearch } from "./helpers"

export type DataTableRootProps<TData> = {
  data: TData[]
  columns: DataTableColumnDef[]
  /** Initial page size. Default 10. */
  pageSize?: number
  getRowId?: (row: TData, index: number) => string
  /** Fields the search box looks at. Default: every primitive field of the row. */
  searchKeys?: readonly string[]
  children: ReactNode
}

export function Root<TData>({
  data,
  columns,
  pageSize = 10,
  getRowId,
  searchKeys,
  children,
}: DataTableRootProps<TData>) {
  const table = useTable<DataTableFeatures, any>({
    features: dataTableFeatures,
    data,
    columns,
    getRowId: getRowId as ((row: any, index: number) => string) | undefined,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    defaultColumn: { sortFn: sortFn_thai, filterFn: "equalsString" },
    globalFilterFn: (row, _columnId, value) => matchesSearch(row.original, String(value ?? ""), searchKeys),
    getColumnCanGlobalFilter: () => true,
  })
  return <DataTableProvider value={table}>{children}</DataTableProvider>
}
