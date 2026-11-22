import { Actions, Filter, Search, Toolbar } from "./toolbar"
import { Content } from "./content"
import { Pagination } from "./pagination"
import { Root } from "./root"

export const DataTable = { Root, Toolbar, Search, Filter, Actions, Content, Pagination }

export { ColumnHeader } from "./column-header"
export { RowActions, type RowAction } from "./row-actions"
export { rowNumberColumn } from "./row-number"
export { useDataTable } from "./context"
export type { DataTableColumnDef } from "./features"
export type { DataTableRootProps } from "./root"
export type { FilterOption } from "./toolbar"
