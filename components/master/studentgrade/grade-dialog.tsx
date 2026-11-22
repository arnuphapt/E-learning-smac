"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { DEFAULT_DOMAIN } from "@/lib/course-access"
import { FormField } from "@/components/common/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MasterFormDialog } from "@/components/master/form-dialog"

export type StudentGradeRow = Database["public"]["Tables"]["student_grades"]["Row"]

export interface GradeSaveInput {
  prefix: string
  year_label: string
  domain: string
  newDomain: boolean
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/
const NEW_DOMAIN = "__new__"
const STANDARD_YEARS = ["ชั้นปีที่ 1", "ชั้นปีที่ 2", "ชั้นปีที่ 3", "ชั้นปีที่ 4"]
// Public mail providers: anyone can open an account there, so allowing one would let the whole internet sign in.
const PUBLIC_MAIL = ["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"]

export function GradeDialog({
  mode,
  row,
  grades,
  domains,
  onClose,
  onSave,
}: {
  mode: "add" | "edit"
  row?: StudentGradeRow
  grades: StudentGradeRow[]
  domains: string[]
  onClose: () => void
  onSave: (data: GradeSaveInput) => void
}) {
  const [domainSel, setDomainSel] = useState(row ? row.domain || DEFAULT_DOMAIN : DEFAULT_DOMAIN)
  const [newDomain, setNewDomain] = useState("")
  const domain = domainSel === NEW_DOMAIN ? newDomain.trim().toLowerCase() : domainSel
  const external = domain !== DEFAULT_DOMAIN // external domains: tutor mode only (see lib/registration.js)
  const [scope, setScope] = useState(row && row.prefix === "" ? "all" : "prefix")
  const [prefix, setPrefix] = useState(row ? row.prefix : "")
  const [yearLabel, setYearLabel] = useState(row ? row.year_label : "ชั้นปีที่ 1")
  const [isCustom, setIsCustom] = useState(Boolean(row && !STANDARD_YEARS.includes(row.year_label)))
  const [customLabel, setCustomLabel] = useState(row && !STANDARD_YEARS.includes(row.year_label) ? row.year_label : "")

  const handleSave = () => {
    const isAllDomain = external && scope === "all"
    const cleanPrefix = isAllDomain ? "" : prefix.trim()
    if (!isAllDomain && (!cleanPrefix || cleanPrefix.length !== 2 || Number.isNaN(Number(cleanPrefix)))) {
      toast.error("กรุณากรอกรหัสนักศึกษา 2 ตัวแรกให้ถูกต้อง (เช่น 66)")
      return
    }
    if (!DOMAIN_RE.test(domain)) {
      toast.error("กรุณาระบุโดเมนให้ถูกต้อง (เช่น partner.ac.th)")
      return
    }
    if (PUBLIC_MAIL.includes(domain)) {
      toast.error(`ไม่อนุญาตโดเมนอีเมลสาธารณะ (${domain}): ใครก็สมัครได้ กรุณาใช้โดเมนขององค์กรเท่านั้น`)
      return
    }
    if (mode === "add" && grades.some((g) => (g.domain || DEFAULT_DOMAIN) === domain && g.prefix === cleanPrefix)) {
      toast.error(
        cleanPrefix === ""
          ? "โดเมนนี้มีชั้นปีแบบทั้งโดเมนอยู่แล้ว"
          : `รหัสประจำตัวขึ้นต้นด้วย "${cleanPrefix}" ของโดเมน ${domain} ได้ถูกกำหนดไว้แล้ว`,
      )
      return
    }
    const finalLabel = isCustom ? customLabel.trim() : yearLabel
    if (!finalLabel) {
      toast.error("กรุณาระบุชั้นปี")
      return
    }
    onSave({ prefix: cleanPrefix, year_label: finalLabel, domain, newDomain: !domains.includes(domain) })
  }

  return (
    <MasterFormDialog
      title={mode === "add" ? "เพิ่มการกำหนดชั้นปี" : "แก้ไขการกำหนดชั้นปี"}
      description="กำหนดความสัมพันธ์ระหว่างเลขรหัสนักศึกษา 2 ตัวหน้าและระดับชั้นปี ของแต่ละโดเมนอีเมล"
      onClose={onClose}
      onSubmit={handleSave}
    >
      <FormField
        label="โดเมนอีเมล"
        htmlFor="grade-domain"
        required
        description={
          external
            ? `โดเมนอื่นนอกจาก ${DEFAULT_DOMAIN} เป็นโดเมนภายนอก: ผู้ล็อกอินด้วยอีเมลโดเมนนี้จะเข้าได้เฉพาะชุดติว (Tutor) เท่านั้น โดยชั้นปีคำนวณจากเลขรหัสในอีเมล (ตัวเลขล้วนก่อน @) ตามตารางของโดเมนนี้ หรือเลือก 'ใช้ทั้งโดเมน' หากอีเมลไม่มีรหัสนักศึกษา และเลือกล็อกชุดติวได้ในหน้าตั้งค่าชุดติว`
            : undefined
        }
      >
        <Select
          value={domainSel}
          onValueChange={(v) => {
            setDomainSel(v)
            if (v === DEFAULT_DOMAIN) setScope("prefix")
          }}
          disabled={mode === "edit"}
        >
          <SelectTrigger id="grade-domain" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...new Set([DEFAULT_DOMAIN, ...domains])].map((d) => (
              <SelectItem key={d} value={d}>
                {d}
                {d === DEFAULT_DOMAIN ? " (ค่าเริ่มต้น)" : ""}
              </SelectItem>
            ))}
            <SelectItem value={NEW_DOMAIN}>เพิ่มโดเมนใหม่…</SelectItem>
          </SelectContent>
        </Select>
        {domainSel === NEW_DOMAIN && (
          <Input aria-label="โดเมนใหม่" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="เช่น partner.ac.th" />
        )}
      </FormField>

      {external && (
        <FormField
          label="รูปแบบการกำหนดชั้นปี"
          htmlFor="grade-scope"
          description={scope === "all" ? "ทุกคนที่เข้าสู่ระบบด้วยโดเมนนี้จะได้ชั้นปีนี้ ใช้สำหรับวิทยาลัยที่อีเมลไม่มีรหัสนักศึกษา" : undefined}
        >
          <ToggleGroup
            id="grade-scope"
            type="single"
            variant="outline"
            value={scope}
            onValueChange={(v) => v && setScope(v)}
            disabled={mode === "edit"}
            aria-label="รูปแบบการกำหนดชั้นปี"
            className="w-full"
          >
            <ToggleGroupItem value="prefix" className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              กำหนดเลขต้นรหัส
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              ใช้ทั้งโดเมน
            </ToggleGroupItem>
          </ToggleGroup>
        </FormField>
      )}

      {(!external || scope !== "all") && (
        <FormField
          label="รหัสนักศึกษา 2 ตัวหน้า"
          htmlFor="grade-prefix"
          required
          description={mode === "add" ? "ตัวเลข 2 หลักแรกของรหัสนักศึกษา (เช่น นักศึกษารหัส 66xxxxxx ป้อน 66)" : undefined}
        >
          <Input
            id="grade-prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="เช่น 65 หรือ 66"
            disabled={mode === "edit"}
            maxLength={2}
            inputMode="numeric"
          />
        </FormField>
      )}

      <div className="grid gap-3">
        <span className="text-sm font-medium">
          ระดับชั้นปี <span aria-hidden className="text-destructive">*</span>
        </span>
        <RadioGroup value={isCustom ? "custom" : "standard"} onValueChange={(v) => setIsCustom(v === "custom")}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="standard" id="grade-standard" />
            <Label htmlFor="grade-standard">เลือกจากรายการชั้นปีมาตรฐาน</Label>
          </div>
          {!isCustom && (
            <Select value={yearLabel} onValueChange={setYearLabel}>
              <SelectTrigger aria-label="ชั้นปีมาตรฐาน" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STANDARD_YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-2">
            <RadioGroupItem value="custom" id="grade-custom" />
            <Label htmlFor="grade-custom">กำหนดชั้นปีเอง (Custom)</Label>
          </div>
          {isCustom && (
            <Input
              aria-label="ชั้นปีที่กำหนดเอง"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="เช่น ชั้นปีที่ 5 หรือ หลักสูตรพิเศษ"
            />
          )}
        </RadioGroup>
      </div>
    </MasterFormDialog>
  )
}
