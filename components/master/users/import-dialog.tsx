"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { CheckIcon, DownloadIcon, UploadIcon } from "lucide-react"
import { DataTable, type DataTableColumnDef } from "@/components/common/data-table"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  MAX_FILE_BYTES,
  downloadTemplate,
  getErrorMessage,
  loadXlsx,
  parseUserImportRows,
  saveImportRows,
  type ExistingUserOption,
  type ImportSummary,
  type ParsedImportRow,
  type RoleOption,
  type SectionOption,
} from "./import-logic"

const previewColumns: DataTableColumnDef[] = [
  { accessorKey: "rowNum", header: "แถว", cell: ({ row }) => <span className="text-xs tabular-nums text-muted-foreground">{row.original.rowNum}</span> },
  { accessorKey: "name", header: "ชื่อ", cell: ({ row }) => row.original.name || <span className="text-muted-foreground">-</span> },
  { accessorKey: "email", header: "อีเมล", cell: ({ row }) => <span className="text-muted-foreground">{row.original.email || "-"}</span> },
  { id: "role", header: "บทบาท", cell: ({ row }) => row.original.role || row.original.rawRole || "-" },
  { id: "section", header: "Section", cell: ({ row }) => row.original.section || row.original.rawSection || "-" },
  {
    id: "status",
    header: "สถานะ",
    cell: ({ row }) => {
      const r: ParsedImportRow = row.original
      return r.status === "ok" ? (
        <div className="flex flex-wrap items-center gap-1">
          <ToneBadge tone="success">OK</ToneBadge>
          <span className="text-xs text-muted-foreground">{r.existingId ? "อัปเดต" : "เพิ่มใหม่"}</span>
        </div>
      ) : (
        <div>
          <ToneBadge tone="danger">Error</ToneBadge>
          <div className="mt-1 text-xs text-destructive">{r.reasons.join(", ")}</div>
        </div>
      )
    },
  },
]

export function ImportUsersDialog({
  rolesList,
  sectionsList,
  existingUsers,
  onClose,
  onImported,
}: {
  rolesList: RoleOption[]
  sectionsList: SectionOption[]
  existingUsers: ExistingUserOption[]
  onClose: () => void
  onImported: () => Promise<void> | void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState("")
  const [fileError, setFileError] = useState("")
  const [rows, setRows] = useState<ParsedImportRow[]>([])
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const close = () => {
    if (!saving) onClose()
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error("ไฟล์ใหญ่เกิน 5 MB")
      return
    }

    setReading(true)
    setSummary(null)
    setFileError("")
    setRows([])
    setFileName(file.name)

    try {
      const XLSX = await loadXlsx()
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws || !ws["!ref"]) {
        throw new Error("ไม่พบข้อมูลในชีทแรกของไฟล์")
      }
      const firstRow = XLSX.utils.decode_range(ws["!ref"]).s.r + 1
      const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })
      const { parsedRows, fileError: parseErr } = parseUserImportRows(sheetRows, {
        firstRow,
        rolesList,
        sectionsList,
        existingUsers,
      })

      if (parseErr) {
        setFileError(parseErr)
      } else {
        setRows(parsedRows)
      }
    } catch (err: unknown) {
      setFileError("อ่านไฟล์ไม่สำเร็จ: " + getErrorMessage(err))
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const okRows = rows.filter((r) => r.status === "ok")
  const errorRows = rows.filter((r) => r.status === "error")

  const handleConfirm = async () => {
    if (okRows.length === 0 || saving) return
    setSaving(true)

    const { lookupError, inserted, updated, saveErrors } = await saveImportRows(okRows)
    if (lookupError) {
      setSaving(false)
      toast.error("ตรวจสอบผู้ใช้ก่อนนำเข้าไม่สำเร็จ: " + lookupError)
      return
    }

    const totalErrors = errorRows.length + saveErrors.length
    setSummary({ inserted, updated, errors: totalErrors, saveErrors })
    setSaving(false)

    await onImported()
    const message = `นำเข้าเสร็จสิ้น: เพิ่มใหม่ ${inserted}, อัปเดต ${updated}, ผิดพลาด ${totalErrors}`
    if (saveErrors.length > 0) toast.warning(message)
    else toast.success(message)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>นำเข้าผู้ใช้งานจาก Excel</DialogTitle>
          <DialogDescription>รองรับคอลัมน์ name/ชื่อ, email/อีเมล, role/บทบาท, section</DialogDescription>
        </DialogHeader>

        <Input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          aria-label="เลือกไฟล์ Excel"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="grid max-h-[60vh] gap-3 overflow-y-auto">
          {!summary && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={saving || reading}>
                <UploadIcon />
                {reading ? "กำลังอ่านไฟล์…" : fileName ? "เลือกไฟล์อื่น" : "เลือกไฟล์ Excel (.xlsx / .xls)"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadTemplate(rolesList, sectionsList).catch((e: unknown) =>
                    toast.error("สร้างไฟล์ตัวอย่างไม่สำเร็จ: " + getErrorMessage(e)),
                  )
                }
                disabled={saving}
              >
                <DownloadIcon />
                ดาวน์โหลด template
              </Button>
              {fileName && <span className="font-mono text-xs text-muted-foreground">{fileName}</span>}
            </div>
          )}

          {!fileName && !fileError && !summary && (
            <div className="grid gap-1 text-sm text-muted-foreground">
              <div>
                <b className="text-foreground">คอลัมน์ที่รองรับ:</b> name / ชื่อ, email / อีเมล, role / บทบาท, section
              </div>
              <div>
                • <b className="text-foreground">role:</b> ระบุรหัสหรือชื่อบทบาท (เว้นว่างจะเป็น student)
              </div>
              <div>
                • <b className="text-foreground">section:</b> ต้องตรงกับชื่อ Section ในระบบทุกตัวอักษร (เว้นว่างได้เฉพาะที่ไม่ใช่ student)
              </div>
            </div>
          )}

          {fileError && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {fileError}
            </div>
          )}

          {summary && (
            <div className="grid gap-3">
              <div className="rounded-lg bg-muted p-3">
                <div className="mb-2 font-semibold">สรุปผลการนำเข้า</div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>
                    เพิ่มใหม่: <b className="text-success">{summary.inserted}</b>
                  </span>
                  <span>
                    อัปเดต: <b className="text-primary">{summary.updated}</b>
                  </span>
                  <span>
                    ผิดพลาด/ข้าม: <b className="text-destructive">{summary.errors}</b>
                  </span>
                </div>
              </div>
              {summary.saveErrors.length > 0 && (
                <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="mb-1 font-semibold">รายการที่บันทึกไม่สำเร็จ</div>
                  <ul className="list-disc pl-5">
                    {summary.saveErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!summary && rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>
                  ทั้งหมด <b>{rows.length}</b> แถว
                </span>
                <span>
                  พร้อมนำเข้า <b className="text-success">{okRows.length}</b> แถว
                </span>
                <span>
                  ผิดพลาด <b className="text-destructive">{errorRows.length}</b> แถว (จะไม่ถูกบันทึก)
                </span>
              </div>
              <DataTable.Root data={rows} columns={previewColumns} getRowId={(r: ParsedImportRow) => String(r.rowNum)} pageSize={10}>
                <DataTable.Content />
                <DataTable.Pagination pageSizes={[10, 20, 50]} />
              </DataTable.Root>
            </>
          )}
        </div>

        <DialogFooter>
          {summary ? (
            <Button type="button" onClick={close}>
              ปิด
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={close} disabled={saving}>
                ยกเลิก
              </Button>
              {rows.length > 0 && (
                <Button type="button" onClick={handleConfirm} disabled={saving || okRows.length === 0}>
                  <CheckIcon />
                  {saving ? "กำลังนำเข้า…" : `ยืนยันนำเข้า (${okRows.length} รายการ)`}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
