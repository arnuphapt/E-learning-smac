"use client"

import { useEffect, useMemo, useRef, type ReactNode } from "react"
import { toast } from "sonner"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/states"
import {
  DataTable,
  RowActions,
  selectionColumn,
  type DataTableColumnDef,
  type DataTableStatItem,
  type FilterOption,
  type RowAction,
} from "@/components/common/data-table"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/common/confirm"

/** Actions column (edit + delete kebab) for a master-data table. */
export function masterActionsColumn<T>(
  onEdit: (row: T) => void,
  onDelete: (row: T) => void,
  options: {
    /** Extra actions placed before แก้ไข (e.g. resend). */
    extra?: (row: T) => RowAction[]
    /** Return false to hide ลบ for a row (e.g. built-in roles). */
    canDelete?: (row: T) => boolean
  } = {},
): DataTableColumnDef {
  return {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.original as T
      return (
        <div className="flex justify-end">
          <RowActions
            actions={[
              ...(options.extra?.(r) ?? []),
              { label: "แก้ไข", icon: <PencilIcon />, onSelect: () => onEdit(r) },
              ...(options.canDelete?.(r) === false
                ? []
                : [{ label: "ลบ", icon: <Trash2Icon />, destructive: true, onSelect: () => onDelete(r) }]),
            ]}
          />
        </div>
      )
    },
  }
}

/** Resolves true once the user confirms the (irreversible) delete. */
export function useConfirmDelete(message = "การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการต่อ") {
  const confirm = useConfirm()
  return (title: string, desc: string) =>
    confirm({
      title,
      desc,
      message,
      danger: true,
      confirmText: "ลบข้อมูล",
    })
}

/** Opt-in row selection + "ลบที่เลือก" for a master-data list. */
export type MasterBulkDelete<T> = {
  /** Thai noun for the confirm text, e.g. "ปีการศึกษา". */
  noun: string
  rowLabel: (row: T) => string
  /** Return false to leave a row out (e.g. built-in roles); it is skipped, not deleted. */
  canDelete?: (row: T) => boolean
  /** Runs the same delete as the row's ลบ, with `.in("id", ids)`. Resolve true on success (selection is cleared); toast inside. */
  onDelete: (rows: T[]) => Promise<boolean>
}

/** Master-data list page: container + header + searchable/sortable table with an add button. Dialogs go in `children`. */
export function MasterListPage<T extends { id: string }>({
  title,
  description,
  note,
  addLabel,
  onAdd,
  filters,
  stats,
  bulkDelete,
  data,
  columns,
  loading,
  searchKeys,
  searchPlaceholder,
  emptyTitle,
  children,
}: {
  title: string
  description: string
  /** Small line above the table (old table description). */
  note?: string
  addLabel: string
  /** Omit to hide the add button (no permission). */
  onAdd?: () => void
  /** Column filters shown next to the search box. */
  filters?: { column: string; options: readonly FilterOption[]; allLabel: string }[]
  /** Summary cards above the toolbar. */
  stats?: readonly DataTableStatItem[]
  bulkDelete?: MasterBulkDelete<T>
  data: T[]
  columns: DataTableColumnDef[]
  loading: boolean
  searchKeys: readonly string[]
  searchPlaceholder: string
  emptyTitle: string
  children?: ReactNode
}) {
  const tabFilter = filters?.find((f) => f.options.length > 0 && f.options.length <= 5)
  const dropdownFilters = filters?.filter((f) => f !== tabFilter)
  const countOf = (col: string, val: string) =>
    data.filter((r) => String((r as Record<string, unknown>)[col] ?? "") === val).length

  const confirmDelete = useConfirmDelete()
  const hasBulk = !!bulkDelete
  const rowLabel = bulkDelete?.rowLabel
  const labelRef = useRef(rowLabel)
  useEffect(() => {
    labelRef.current = rowLabel
  })
  // rowLabel is an inline arrow on every page render; read it through a ref so the columns keep a stable identity.
  const allColumns = useMemo(
    // eslint-disable-next-line react-hooks/refs -- the ref is only read when a row's checkbox renders its aria-label, after the effect has stored the latest rowLabel
    () => (hasBulk ? [selectionColumn<T>((r) => labelRef.current?.(r) ?? r.id), ...columns] : columns),
    [columns, hasBulk],
  )
  const runBulkDelete = async (rows: T[], clear: () => void) => {
    if (!bulkDelete) return
    const targets = bulkDelete.canDelete ? rows.filter(bulkDelete.canDelete) : rows
    if (targets.length === 0) {
      toast.error(`ไม่มี${bulkDelete.noun}ที่ลบได้ในรายการที่เลือก`)
      return
    }
    const skipped = rows.length - targets.length
    const ok = await confirmDelete(
      `ลบ${bulkDelete.noun}ที่เลือก`,
      `ต้องการลบ${bulkDelete.noun} ${targets.length} รายการหรือไม่?${skipped > 0 ? ` (ข้าม ${skipped} รายการที่ลบไม่ได้)` : ""}`,
    )
    if (!ok) return
    if (await bulkDelete.onDelete(targets)) clear()
  }

  return (
    <PageContainer>
      <PageHeader
        kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)"
        title={title}
        description={description}
        actions={
          onAdd && (
            <Button onClick={onAdd}>
              <PlusIcon />
              {addLabel}
            </Button>
          )
        }
      />
      {note && <p className="mb-3 text-sm text-muted-foreground">{note}</p>}
      <DataTable.Root data={data} columns={allColumns} getRowId={(r: T) => r.id} searchKeys={searchKeys}>
        {stats && <DataTable.Stats items={stats} />}
        {tabFilter && (
          <DataTable.Tabs
            column={tabFilter.column}
            options={[
              { label: tabFilter.allLabel, value: undefined, count: data.length },
              ...tabFilter.options.map((o) => ({ label: o.label, value: o.value, count: countOf(tabFilter.column, o.value) })),
            ]}
          />
        )}
        <DataTable.Toolbar>
          <DataTable.Search placeholder={searchPlaceholder} />
          {dropdownFilters?.map((f) => (
            <DataTable.Filter key={f.column} {...f} />
          ))}
        </DataTable.Toolbar>
        {bulkDelete && (
          <DataTable.BulkBar<T>>
            {({ rows, clear }) => (
              <Button type="button" size="sm" variant="destructive" onClick={() => runBulkDelete(rows, clear)}>
                <Trash2Icon />
                ลบที่เลือก
              </Button>
            )}
          </DataTable.BulkBar>
        )}
        <DataTable.Content loading={loading} empty={<EmptyState title={emptyTitle} />} />
        <DataTable.Pagination />
      </DataTable.Root>
      {children}
    </PageContainer>
  )
}
