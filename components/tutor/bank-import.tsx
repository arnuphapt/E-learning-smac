"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, DownloadIcon, UploadIcon } from "lucide-react"
import { FilePickButton } from "@/components/lesson/file-pick-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  parseImportRows,
  TEMPLATE_HEADERS,
  TEMPLATE_EXAMPLES,
  MAX_IMPORT_ROWS,
  type ImportedQuestionRow,
  type ImportErrorRow,
} from "@/lib/tutor-import"
import { ImportPreview } from "./import-preview"
import { loadXlsx } from "./xlsx"

interface ImportTopic {
  name?: string | null
}

interface ParsedImportFile {
  name: string
  ok: ImportedQuestionRow[]
  errors: ImportErrorRow[]
}

interface ImportOutcome {
  imported: number
  failed: Array<{ row: number; message: string }>
}

interface BankImportProps {
  topics: readonly ImportTopic[]
  onClose: () => void
  onImport: (items: ImportedQuestionRow[]) => Promise<ImportOutcome>
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const errMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e))

async function downloadTemplate() {
  const XLSX = await loadXlsx()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES])
  ws["!cols"] = [{ wch: 40 }, ...Array(5).fill({ wch: 18 }), { wch: 8 }, { wch: 32 }, { wch: 20 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "ข้อสอบ")
  XLSX.writeFile(wb, "ตัวอย่างนำเข้าข้อสอบ.xlsx")
}

// onImport(items) -> { imported, failed: [{ row, message }] }. The dialog stays open on partial failure and keeps the
// failed rows (ticked, with the reason) so the instructor can retry them. Mounted only while open.
export function BankImport({ topics, onClose, onImport }: BankImportProps) {
  const [file, setFile] = useState<ParsedImportFile | null>(null)
  const [picked, setPicked] = useState<Set<number>>(() => new Set())
  const [failed, setFailed] = useState<Record<number, string>>({}) // row -> message from the last import attempt
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => {
    if (!busy) onClose()
  }

  const readFile = async (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      toast.error("ไฟล์ใหญ่เกิน 5 MB")
      return
    }
    setReading(true)
    try {
      const XLSX = await loadXlsx()
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws || !ws["!ref"]) throw new Error("ไม่พบข้อมูลในชีทแรกของไฟล์")
      const firstRow = XLSX.utils.decode_range(ws["!ref"]).s.r + 1
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
      const { ok, errors } = parseImportRows(rows, { firstRow, existingTopics: topics })
      setFile({ name: f.name, ok, errors })
      setPicked(new Set(ok.map((q) => q.row)))
      setFailed({})
    } catch (e: unknown) {
      toast.error("อ่านไฟล์ไม่สำเร็จ: " + errMessage(e))
    } finally {
      setReading(false)
    }
  }

  const toggle = (row: number) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(row)) n.delete(row)
      else n.add(row)
      return n
    })
  const allOn = Boolean(file && file.ok.length > 0 && file.ok.every((q) => picked.has(q.row)))
  const toggleAll = () => setPicked(allOn || !file ? new Set() : new Set(file.ok.map((q) => q.row)))

  const confirm = async () => {
    if (!file) return
    const items = file.ok.filter((q) => picked.has(q.row))
    setBusy(true)
    let res: ImportOutcome
    try {
      res = await onImport(items)
    } catch (e: unknown) {
      res = { imported: 0, failed: items.map((q) => ({ row: q.row, message: errMessage(e) })) }
    }
    setBusy(false)
    if (!res.failed.length) return onClose()
    const bad = Object.fromEntries(res.failed.map((f) => [f.row, f.message]))
    // imported rows leave the list; failed ones stay ticked with their reason
    setFile((cur) => (cur ? { ...cur, ok: cur.ok.filter((q) => !picked.has(q.row) || bad[q.row]) } : null))
    setPicked(new Set(Object.keys(bad).map(Number)))
    setFailed(bad)
  }

  const count = file ? file.ok.filter((q) => picked.has(q.row)).length : 0

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>นำเข้าข้อสอบจาก Excel</DialogTitle>
          <DialogDescription>ไฟล์ถูกอ่านในเบราว์เซอร์ของคุณ ไม่ได้อัปโหลดไปที่เซิร์ฟเวอร์ จนกว่าจะกดยืนยันนำเข้า</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <FilePickButton label="เลือกไฟล์ Excel" accept=".xlsx,.xls" variant="outline" disabled={busy || reading} icon={<UploadIcon />} onFile={readFile}>
            {reading ? "กำลังอ่านไฟล์…" : file ? "เลือกไฟล์อื่น" : "เลือกไฟล์ Excel"}
          </FilePickButton>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadTemplate().catch((e: unknown) => toast.error("สร้างไฟล์ตัวอย่างไม่สำเร็จ: " + errMessage(e)))}
          >
            <DownloadIcon />
            ดาวน์โหลดไฟล์ตัวอย่าง
          </Button>
          {file && <span className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">{file.name}</span>}
        </div>

        {!file && (
          <div className="grid gap-1 text-sm text-muted-foreground">
            <div className="mb-1">แถวแรกเป็นหัวตาราง 1 แถวต่อ 1 ข้อ (ชีทแรก ไม่เกิน {MAX_IMPORT_ROWS} ข้อต่อไฟล์)</div>
            <div>
              <b className="text-foreground">จำเป็น</b> โจทย์ · ตัวเลือก ก · ตัวเลือก ข · เฉลย
            </div>
            <div>
              <b className="text-foreground">ไม่บังคับ</b> ตัวเลือก ค, ง, จ · คำอธิบาย · หัวข้อ
            </div>
            <div>เฉลยใส่ ก ข ค ง จ (หรือ A-E, 1-5) และต้องชี้ไปที่ตัวเลือกที่ไม่ว่าง</div>
          </div>
        )}

        {file && (
          <>
            <div className="text-sm">
              อ่านได้ <b className="text-success">{file.ok.length}</b> ข้อ
              {file.errors.length > 0 && (
                <>
                  {" "}
                  · มีปัญหา <b className="text-destructive">{file.errors.length}</b> แถว (ไม่ถูกนำเข้า)
                </>
              )}
            </div>

            {file.errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <div className="mb-1 font-semibold">แถวที่นำเข้าไม่ได้ แก้ในไฟล์แล้วเลือกไฟล์ใหม่</div>
                <ul className="max-h-32 list-disc overflow-auto pl-5">
                  {file.errors.map((e, i) => (
                    <li key={i}>
                      {e.row ? `แถว ${e.row}: ` : ""}
                      {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {file.ok.length > 0 && <ImportPreview rows={file.ok} picked={picked} failed={failed} busy={busy} onToggle={toggle} onToggleAll={toggleAll} />}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            ยกเลิก
          </Button>
          {file && (
            <Button onClick={confirm} disabled={busy || count === 0}>
              <CheckIcon />
              {busy ? "กำลังนำเข้า…" : `นำเข้า ${count} ข้อ`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
