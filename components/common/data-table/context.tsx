/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack v9 types are invariant in TData; rows are typed at the call site */
"use client"

import { createContext, useContext } from "react"
import type { ReactTable } from "@tanstack/react-table"
import type { DataTableFeatures } from "./features"

export type DataTableInstance = ReactTable<DataTableFeatures, any>

const DataTableContext = createContext<DataTableInstance | null>(null)

export const DataTableProvider = DataTableContext.Provider

export function useDataTable(): DataTableInstance {
  const table = useContext(DataTableContext)
  if (!table) throw new Error("DataTable parts must be rendered inside <DataTable.Root>")
  return table
}
