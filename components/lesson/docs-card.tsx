"use client"

import { useMemo, type ReactNode } from "react"
import { EyeIcon, FileIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { fileHref } from "@/lib/files"
import { ColumnHeader, DataTable, type DataTableColumnDef } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FilePickButton } from "./file-pick-button"
import type { DocItem } from "./types"

function docColumns(onDelete: (d: DocItem) => void): DataTableColumnDef[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="ชื่อไฟล์" />,
      cell: ({ row }) => {
        const d: DocItem = row.original
        return (
          <div className="flex min-w-48 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
              <FileIcon className="size-4" />
            </div>
            <span className="truncate font-semibold">{d.name}</span>
          </div>
        )
      },
    },
    { accessorKey: "size", header: "ขนาด", enableSorting: false, cell: ({ row }) => <span className="text-muted-foreground">{(row.original as DocItem).size}</span> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const d: DocItem = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={fileHref(d.url)} target="_blank" rel="noopener noreferrer">
                <EyeIcon />
                เปิดดู
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`ลบเอกสาร ${d.name}`} onClick={() => onDelete(d)}>
              <Trash2Icon />
            </Button>
          </div>
        )
      },
    },
  ]
}

/** One document list (student documents or AI-only documents) with its upload button. */
export function DocsCard({
  title,
  description,
  uploadLabel,
  uploadingLabel = "กำลังอัปโหลด...",
  uploadAriaLabel,
  uploading,
  docs,
  emptyIcon,
  emptyText,
  onUpload,
  onDelete,
}: {
  title: ReactNode
  description: string
  uploadLabel: string
  uploadingLabel?: string
  uploadAriaLabel: string
  uploading: boolean
  docs: DocItem[]
  emptyIcon: ReactNode
  emptyText: string
  onUpload: (file: File) => void
  onDelete: (d: DocItem) => void
}) {
  const columns = useMemo(() => docColumns(onDelete), [onDelete])
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <FilePickButton label={uploadAriaLabel} disabled={uploading} icon={<UploadIcon />} onFile={onUpload}>
          {uploading ? uploadingLabel : uploadLabel}
        </FilePickButton>
      </CardHeader>
      <div className="px-6">
        <DataTable.Root data={docs} columns={columns} getRowId={(d: DocItem, i: number) => `${d.path ?? d.name}-${i}`} pageSize={50}>
          <DataTable.Content empty={<EmptyState icon={emptyIcon} title={emptyText} />} />
        </DataTable.Root>
      </div>
    </Card>
  )
}
