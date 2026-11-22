import type { DataTableColumnDef } from "./features"

/** The old table's leading "ลำดับ" column; numbering continues across pages. Put it first in `columns`. */
export function rowNumberColumn(): DataTableColumnDef {
  return {
    id: "__rowNumber",
    header: "ลำดับ",
    enableSorting: false,
    enableGlobalFilter: false,
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.store.get().pagination
      const rowsOnPage = table.getRowModel().rows
      return (
        <span className="tabular-nums text-muted-foreground">
          {pageIndex * pageSize + rowsOnPage.findIndex((r) => r.id === row.id) + 1}
        </span>
      )
    },
  }
}
