import { Actions, Filter, Search, Toolbar } from "./toolbar"
import { Content } from "./content"
import { Pagination } from "./pagination"
import { Root } from "./root"
import { Stats } from "./stats"
import { Tabs } from "./tabs"

export const DataTable = { Root, Stats, Tabs, Toolbar, Search, Filter, Actions, Content, Pagination }

export { AvatarCell, ProgressCell } from "./cells"
export { ColumnHeader } from "./column-header"
export { RowActions, type RowAction } from "./row-actions"
export { rowNumberColumn } from "./row-number"
export { useDataTable } from "./context"
export type { DataTableColumnDef } from "./features"
export type { DataTableRootProps } from "./root"
export type { DataTableStatItem, StatTone } from "./stats"
export type { DataTableTabOption } from "./tabs"
export type { FilterOption } from "./toolbar"
