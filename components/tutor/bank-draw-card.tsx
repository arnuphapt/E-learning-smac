"use client"

import { CheckIcon, TriangleAlertIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** "จำนวนข้อต่อรอบ": whole bank or a fixed draw size, with the bank-size warning. */
export function BankDrawCard({
  whole,
  onWhole,
  drawInput,
  onDrawInput,
  warning,
  onSave,
}: {
  whole: boolean
  onWhole: (v: boolean) => void
  drawInput: string
  onDrawInput: (v: string) => void
  warning?: string | null
  onSave: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>จำนวนข้อต่อรอบ</CardTitle>
        <CardDescription>นักศึกษาแต่ละรอบได้ข้อที่สุ่มจากคลังนี้</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="bank-whole" checked={whole} onCheckedChange={(v) => onWhole(v === true)} />
          <Label htmlFor="bank-whole">ใช้ทั้งคลัง</Label>
        </div>
        <FormField label="หรือกำหนดจำนวนข้อต่อรอบ" htmlFor="bank-draw">
          <Input id="bank-draw" inputMode="numeric" value={drawInput} disabled={whole} onChange={(e) => onDrawInput(e.target.value.replace(/[^0-9]/g, ""))} placeholder="เช่น 20" />
        </FormField>
        {warning && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>{warning}</span>
          </div>
        )}
        <Button className="w-full" onClick={onSave}>
          <CheckIcon />
          บันทึกการตั้งค่า
        </Button>
      </CardContent>
    </Card>
  )
}
