"use client"

import { useState } from "react"
import { InfoIcon, SendIcon } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { FormField } from "@/components/common/form-field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MasterFormDialog } from "@/components/master/form-dialog"

export type BroadcastRow = Database["public"]["Tables"]["broadcasts"]["Row"]

export interface BroadcastFormValues {
  title: string
  body: string
  pinned: boolean
  expires_at: string | null
  year_level: number[]
}

export function BroadcastDialog({
  mode,
  row,
  masterYearLabels,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row?: BroadcastRow
  masterYearLabels: string[]
  onClose: () => void
  onSave: (values: BroadcastFormValues) => void
}) {
  const [title, setTitle] = useState(row?.title || "")
  const [body, setBody] = useState(row?.body || "")
  const [pinned, setPinned] = useState(row?.pinned || false)
  const [expiresAt, setExpiresAt] = useState(row?.expires_at ? row.expires_at.slice(0, 10) : "")
  const [editYearLevels, setEditYearLevels] = useState<Array<string | number>>(
    (row?.year_level || []).map((y) => (typeof y === "number" || !isNaN(Number(y)) ? `ชั้นปีที่ ${y}` : y)),
  )
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})

  const clearError = (key: "title" | "body") => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const handleSave = () => {
    const next: { title?: string; body?: string } = {}
    if (!title.trim()) next.title = "กรุณากรอกหัวข้อประกาศ"
    if (!body.trim()) next.body = "กรุณากรอกเนื้อหา"
    if (Object.keys(next).length > 0) {
      setErrors(next)
      document.getElementById(next.title ? "bc-title" : "bc-body")?.focus()
      return
    }
    const finalYearLevels = editYearLevels
      .map((y) => {
        const parsed = parseInt(String(y).replace(/\D/g, ""), 10)
        return isNaN(parsed) ? null : parsed
      })
      .filter((v): v is number => Boolean(v))

    onSave({ title: title.trim(), body: body.trim(), pinned, expires_at: expiresAt || null, year_level: finalYearLevels })
  }

  return (
    <MasterFormDialog
      title={mode === "add" ? "สร้างประกาศใหม่" : "แก้ไขประกาศ"}
      description="ประกาศจะแสดงในหน้าของนักศึกษาตามชั้นปีที่กำหนด"
      onClose={onClose}
      onSubmit={handleSave}
      submitIcon={<SendIcon />}
    >
      <FormField label="หัวข้อประกาศ" htmlFor="bc-title" error={errors.title} required>
        <Input
          id="bc-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            clearError("title")
          }}
          placeholder="เช่น แจ้งปิดระบบชั่วคราว"
        />
      </FormField>
      <FormField label="เนื้อหา" htmlFor="bc-body" error={errors.body} required>
        <Textarea
          id="bc-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            clearError("body")
          }}
          rows={4}
          placeholder="รายละเอียดประกาศ..."
        />
      </FormField>

      <div className="grid gap-2">
        <span className="text-sm font-medium">
          ชั้นปีที่ประกาศถึง <span className="text-xs font-normal text-muted-foreground">(ไม่เลือก = ทุกชั้นปี)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {masterYearLabels.length === 0 ? (
            <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูลชั้นปี...</span>
          ) : (
            masterYearLabels.map((yrLabel) => {
              const numberMatch = parseInt(yrLabel.replace(/\D/g, ""))
              const checked =
                editYearLevels.includes(yrLabel) ||
                (!isNaN(numberMatch) && editYearLevels.includes(numberMatch)) ||
                editYearLevels.includes(String(numberMatch))
              return (
                <Label
                  key={yrLabel}
                  htmlFor={`bc-yr-${yrLabel}`}
                  className="cursor-pointer rounded-lg border px-3 py-2 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-soft"
                >
                  <Checkbox
                    id={`bc-yr-${yrLabel}`}
                    checked={checked}
                    onCheckedChange={() =>
                      setEditYearLevels((prev) =>
                        checked
                          ? prev.filter((y) => y !== yrLabel && (!isNaN(numberMatch) ? String(y) !== String(numberMatch) : true))
                          : [...prev, yrLabel].sort(),
                      )
                    }
                  />
                  {yrLabel}
                </Label>
              )
            })
          )}
        </div>
        {editYearLevels.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <InfoIcon className="size-3.5" />
            นักศึกษาทุกชั้นปีจะมองเห็นประกาศนี้
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="วันหมดอายุ (ไม่บังคับ)" htmlFor="bc-expires">
          <Input id="bc-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </FormField>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox id="bc-pinned" checked={pinned} onCheckedChange={(c) => setPinned(c === true)} />
          <Label htmlFor="bc-pinned">ปักหมุด (แสดงก่อน)</Label>
        </div>
      </div>
    </MasterFormDialog>
  )
}
