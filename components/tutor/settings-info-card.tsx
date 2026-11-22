import { CheckIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { HERO_COLORS } from "./settings-lookup"

/** "ข้อมูลชุดติว": title, read-only code, description and the card colour. */
export function SettingsInfoCard({
  code,
  title,
  onTitle,
  subtitle,
  onSubtitle,
  hero,
  onHero,
}: {
  code?: string | null
  title: string
  onTitle: (v: string) => void
  subtitle: string
  onSubtitle: (v: string) => void
  hero: string
  onHero: (v: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลชุดติว</CardTitle>
        <CardDescription>ชื่อและคำอธิบายที่นักศึกษาเห็นบนการ์ดชุดติว</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="ชื่อชุดติว" htmlFor="ts-title" required>
            <Input id="ts-title" value={title} onChange={(e) => onTitle(e.target.value)} />
          </FormField>
          <FormField label="รหัสชุด" htmlFor="ts-code">
            <Input id="ts-code" value={code ?? ""} readOnly className="bg-muted font-mono" />
          </FormField>
        </div>
        <FormField label="คำอธิบาย" htmlFor="ts-desc">
          <Textarea id="ts-desc" rows={2} value={subtitle} onChange={(e) => onSubtitle(e.target.value)} placeholder="ติวเรื่องอะไร สำหรับสอบอะไร" />
        </FormField>
        <div className="grid gap-2">
          <Label>สีการ์ด</Label>
          <div className="flex flex-wrap gap-2">
            {HERO_COLORS.map((c) => (
              <Toggle
                key={c}
                pressed={hero === c}
                onPressedChange={() => onHero(c)}
                aria-label={"สี " + c}
                className="size-9 rounded-lg border-2 border-transparent text-white hover:text-white data-[state=on]:border-foreground data-[state=on]:text-white"
                style={{ backgroundColor: c }}
              >
                {hero === c && <CheckIcon />}
              </Toggle>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
