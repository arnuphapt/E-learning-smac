"use client"

import { FormField } from "@/components/common/form-field"
import { ToneBadge, type StatusTone } from "@/components/common/status-badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

/** Master-data status (not the course publish status in StatusBadge). */
const MASTER_STATUS: Record<string, [StatusTone, string]> = {
  active: ["success", "ใช้งาน"],
  archived: ["muted", "เก็บถาวร"],
  upcoming: ["info", "กำลังจะมาถึง"],
}

export const MASTER_STATUS_ALL = ["active", "upcoming", "archived"] as const
export const MASTER_STATUS_BASIC = ["active", "archived"] as const

export function MasterStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null
  const [tone, label] = MASTER_STATUS[status] ?? ["muted", status]
  return <ToneBadge tone={tone}>{label}</ToneBadge>
}

/** Segmented single-choice status picker for the form dialogs. */
export function StatusField({
  value,
  onChange,
  options = MASTER_STATUS_ALL,
}: {
  value: string
  onChange: (value: string) => void
  options?: readonly string[]
}) {
  return (
    <FormField label="สถานะ" htmlFor="master-status">
      <ToggleGroup
        id="master-status"
        type="single"
        variant="outline"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        aria-label="สถานะ"
        className="w-full"
      >
        {options.map((key) => (
          <ToggleGroupItem key={key} value={key} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {MASTER_STATUS[key][1]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FormField>
  )
}
