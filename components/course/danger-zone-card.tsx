"use client"

import { Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CourseDangerZone({ onDelete }: { onDelete: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive">พื้นที่อันตราย (Danger Zone)</CardTitle>
        <CardDescription>การลบรายวิชานี้จะทำให้บทเรียน ข้อสอบ ใบงาน และรายการส่งงานทั้งหมดของรายวิชาถูกลบอย่างถาวรและไม่สามารถกู้คืนได้</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2Icon />
          ลบรายวิชานี้
        </Button>
      </CardContent>
    </Card>
  )
}
