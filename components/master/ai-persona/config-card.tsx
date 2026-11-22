"use client"

import type { ComponentType } from "react"
import { AlertCircleIcon, CalendarIcon, CheckIcon, FolderIcon, MessageSquareIcon, SettingsIcon, SparklesIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export type ConfigKey = "model" | "daily_chat_limit" | "session_token_limit" | "max_output_tokens" | "max_output_tokens_with_files"
export type ConfigDraft = Record<ConfigKey, string>

const PRESET_MODELS = [
  ["gemini-3.8-flash", "Gemini 3.8 Flash (ค่าเริ่มต้น แนะนำ)"],
  ["gemini-3.5-flash", "Gemini 3.5 Flash (รุ่นใหม่ ประสิทธิภาพสูง)"],
  ["gemini-2.5-flash", "Gemini 2.5 Flash (รุ่นเดิม เสถียร)"],
  ["gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite (เร็วพิเศษ ประหยัด)"],
  ["gemini-2.5-pro", "Gemini 2.5 Pro (คิดวิเคราะห์ลึก)"],
] as const

export const isPresetModel = (model: string) => PRESET_MODELS.some(([id]) => id === model)

const CUSTOM = "custom"

const CONFIG_FIELDS: Array<{ key: Exclude<ConfigKey, "model">; label: string; desc: string; unit: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "daily_chat_limit", label: "โควต้าการใช้งาน (ครั้ง)", desc: "จำนวนครั้งที่นักศึกษาถาม+สรุปได้ในรอบ 5 ชั่วโมง", unit: "ครั้ง/5 ชม.", icon: CalendarIcon },
  { key: "session_token_limit", label: "Session Token Limit", desc: "ขีดจำกัด token รวมของข้อความในแต่ละ session", unit: "tokens", icon: MessageSquareIcon },
  { key: "max_output_tokens", label: "Max Output (ปกติ)", desc: "จำนวน token สูงสุดที่ AI ตอบต่อครั้ง (ไม่มีไฟล์)", unit: "tokens", icon: SparklesIcon },
  { key: "max_output_tokens_with_files", label: "Max Output (มีไฟล์/สรุป)", desc: "จำนวน token สูงสุดเมื่อมีไฟล์แนบหรือโหมดสรุป", unit: "tokens", icon: FolderIcon },
]

function IconTile({ icon: Icon, className }: { icon: ComponentType<{ className?: string }>; className?: string }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-lg bg-primary-soft text-primary" aria-hidden>
      <Icon className={className} />
    </div>
  )
}

export function ConfigCard({
  draft,
  isCustomModel,
  saving,
  onChange,
  onCustomModelChange,
  onSave,
}: {
  draft: ConfigDraft
  isCustomModel: boolean
  saving: boolean
  onChange: (key: ConfigKey, value: string) => void
  onCustomModelChange: (custom: boolean) => void
  onSave: () => void
}) {
  const showCustom = isCustomModel || !isPresetModel(draft.model)
  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-bold">
              <SettingsIcon className="size-4 text-primary" />
              การตั้งค่าโมเดล &amp; โควต้า (Model &amp; Rate Limit)
            </div>
            <p className="mt-1 text-sm text-muted-foreground">กำหนดโมเดลเริ่มต้นและขีดจำกัดการใช้งาน AI ในระบบ</p>
          </div>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner /> บันทึก...
              </>
            ) : (
              <>
                <CheckIcon /> บันทึกการตั้งค่า
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <IconTile icon={SparklesIcon} className="size-9 p-2" />
              <div>
                <label htmlFor="default-ai-model" className="block text-sm font-bold">
                  โมเดลเริ่มต้นของระบบ (Default AI Model)
                </label>
                <div id="default-ai-model-desc" className="text-xs text-muted-foreground">
                  โมเดลหลักที่ใช้สำหรับห้องแชทบทเรียนและโหมดติวเตอร์
                </div>
              </div>
            </div>
            <Select
              value={showCustom ? CUSTOM : draft.model}
              onValueChange={(val) => {
                if (val === CUSTOM) {
                  onCustomModelChange(true)
                } else {
                  onCustomModelChange(false)
                  onChange("model", val)
                }
              }}
            >
              <SelectTrigger id="default-ai-model" aria-describedby="default-ai-model-desc" className="w-full bg-background sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_MODELS.map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>กำหนดเอง (ระบุชื่อโมเดล)…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showCustom && (
            <FormField label="ชื่อโมเดล" htmlFor="custom-ai-model">
              <Input
                id="custom-ai-model"
                className="bg-background font-mono"
                value={draft.model}
                onChange={(e) => onChange("model", e.target.value.trim())}
                placeholder="เช่น gemini-2.5-flash หรือ gemini-3.8-flash"
              />
            </FormField>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CONFIG_FIELDS.map(({ key, label, desc, unit, icon }) => (
            <div key={key} className="flex flex-col gap-2 rounded-xl border bg-muted p-4">
              <div className="flex items-center gap-2">
                <IconTile icon={icon} className="size-8 p-2" />
                <div>
                  <label htmlFor={`config-${key}`} className="block text-sm font-bold">
                    {label}
                  </label>
                  <div id={`config-desc-${key}`} className="text-xs leading-snug text-muted-foreground">
                    {desc}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id={`config-${key}`}
                  aria-describedby={`config-desc-${key}`}
                  className="bg-background text-right text-base font-bold"
                  value={draft[key]}
                  onChange={(e) => onChange(key, e.target.value)}
                  inputMode="numeric"
                />
                <span className="whitespace-nowrap text-xs text-muted-foreground">{unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-primary-soft px-3.5 py-2.5 text-xs text-primary">
          <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>ผู้สอน / Admin ไม่ถูกจำกัดโควต้า · โควต้านับแบบ Rolling Window ย้อนหลัง 5 ชั่วโมง · ค่า Token ประมาณการจากความยาวข้อความ (÷ 2.5)</span>
        </div>
      </CardContent>
    </Card>
  )
}
