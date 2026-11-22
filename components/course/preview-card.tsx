"use client"

import { FolderIcon, UserIcon, UsersIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** Live preview of the course card while the new-course form is filled in. */
export function CoursePreviewCard({
  code,
  term,
  title,
  subtitle,
  mainManagerNames,
  coInstructorNames,
  section,
  groupName,
}: {
  code: string
  term: string
  title: string
  subtitle: string
  mainManagerNames: string[]
  coInstructorNames: string[]
  section: string
  groupName: string | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">ตัวอย่างการ์ดรายวิชา</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <Badge>{code || "รหัสวิชา"}</Badge>
            <span className="text-xs text-muted-foreground">{term || "ภาคเรียน"}</span>
          </div>
          <div className="font-bold">{title || "ชื่อรายวิชา"}</div>
          <div className="mt-1 min-h-8 text-xs text-muted-foreground">{subtitle || "คำอธิบายรายวิชาจะแสดงที่นี่"}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <UserIcon className="size-3.5" />
            ผู้รับผิดชอบหลัก: {mainManagerNames.join(", ") || "ไม่ระบุ"}
          </div>
          {coInstructorNames.length > 0 && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <UsersIcon className="size-3.5" />
              ผู้สอนร่วม: {coInstructorNames.join(", ")}
            </div>
          )}
          {section && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <UsersIcon className="size-3.5" />
              Section: {section}
            </div>
          )}
          {groupName && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <FolderIcon className="size-3.5" />
              {groupName}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
