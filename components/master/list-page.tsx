"use client"

import type { ReactNode } from "react"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/states"
import { DataTable, RowActions, type DataTableColumnDef, type FilterOption, type RowAction } from "@/components/common/data-table"
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

/** Master-data list page: container + header + searchable/sortable table with an add button. Dialogs go in `children`. */
export function MasterListPage<T extends { id: string }>({
  title,
  description,
  note,
  addLabel,
  onAdd,
  filters,
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
  data: T[]
  columns: DataTableColumnDef[]
  loading: boolean
  searchKeys: readonly string[]
  searchPlaceholder: string
  emptyTitle: string
  children?: ReactNode
}) {
  return (
    <PageContainer>
      <PageHeader kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title={title} description={description} />
      {note && <p className="mb-3 text-sm text-muted-foreground">{note}</p>}
      <DataTable.Root data={data} columns={columns} getRowId={(r: T) => r.id} searchKeys={searchKeys}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder={searchPlaceholder} />
          {filters?.map((f) => (
            <DataTable.Filter key={f.column} {...f} />
          ))}
          {onAdd && (
            <DataTable.Actions>
              <Button onClick={onAdd}>
                <PlusIcon />
                {addLabel}
              </Button>
            </DataTable.Actions>
          )}
        </DataTable.Toolbar>
        <DataTable.Content loading={loading} empty={<EmptyState title={emptyTitle} />} />
        <DataTable.Pagination />
      </DataTable.Root>
      {children}
    </PageContainer>
  )
}
