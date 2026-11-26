/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack v9 types are invariant in TData; rows are typed at the call site */
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type SortFn,
} from "@tanstack/react-table"
import { compareThai } from "./helpers"

const sortFn_thai: SortFn<DataTableFeatures, any> = (a, b, columnId) =>
  compareThai(a.getValue(columnId), b.getValue(columnId))

// Module scope on purpose: TanStack v9 needs stable feature objects.
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { equalsString: filterFn_equalsString },
})

export { sortFn_thai }

export type DataTableFeatures = typeof dataTableFeatures
/** Column definition accepted by DataTable.Root. */
// TData is `any` here: v9 ColumnDef is invariant in TData, so a generic column type cannot be passed through useTable.
export type DataTableColumnDef = ColumnDef<DataTableFeatures, any, any>
