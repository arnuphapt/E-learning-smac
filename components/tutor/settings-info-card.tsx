import { FormField } from "@/components/common/form-field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/** "ข้อมูลชุดติว": title, read-only code and description. */
export function SettingsInfoCard({
  code,
  title,
  onTitle,
  subtitle,
  onSubtitle,
}: {
  code?: string | null
  title: string
  onTitle: (v: string) => void
  subtitle: string
  onSubtitle: (v: string) => void
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
      </CardContent>
    </Card>
  )
}
