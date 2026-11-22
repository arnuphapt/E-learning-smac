import { PencilIcon, PlusIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

/** "ผู้รับผิดชอบ" (admin / course_manager only): main instructors and co-instructors of the set. */
export function SettingsStaffCard({
  mains,
  co,
  nameOf,
  disabled,
  onPickMains,
  onPickCo,
}: {
  mains: string[]
  co: string[]
  nameOf: (id: string) => string
  disabled: boolean
  onPickMains: () => void
  onPickCo: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ผู้รับผิดชอบ</CardTitle>
        <CardDescription>อาจารย์ที่เห็นและแก้ชุดนี้ได้</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label>อาจารย์ผู้รับผิดชอบหลัก</Label>
          <div className="flex flex-wrap items-center gap-2">
            {mains.map((id) => (
              <Badge key={id} variant="secondary">
                {nameOf(id)}
              </Badge>
            ))}
            <Button variant="outline" size="sm" onClick={onPickMains} disabled={disabled}>
              <PencilIcon />
              เปลี่ยน
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>อาจารย์ผู้สอนร่วม</Label>
          <div className="flex flex-wrap items-center gap-2">
            {co.length === 0 && <span className="text-sm text-muted-foreground">ยังไม่มี</span>}
            {co.map((id) => (
              <Badge key={id} variant="secondary">
                {nameOf(id)}
              </Badge>
            ))}
            <Button variant="outline" size="sm" onClick={onPickCo} disabled={disabled}>
              <PlusIcon />
              จัดการผู้สอนร่วม
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
