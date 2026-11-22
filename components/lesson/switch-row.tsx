import { useId } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

/** Label on the left, switch on the right, divider underneath (settings side panels). */
export function SwitchRow({ label, on, onChange }: { label: string; on: boolean; onChange: (val: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0">
      <Label htmlFor={id} className="font-normal leading-snug">
        {label}
      </Label>
      <Switch id={id} checked={on} onCheckedChange={onChange} />
    </div>
  )
}
