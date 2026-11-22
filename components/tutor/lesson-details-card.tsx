"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, Loader2Icon, UploadIcon } from "lucide-react"
import { fileHref } from "@/lib/files"
import { FormField } from "@/components/common/form-field"
import { FilePickButton } from "@/components/lesson/file-pick-button"
import { uploadToStorage } from "@/components/lesson/upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SaveTutorLesson, TutorLessonItem } from "./lesson-types"

/** Title, description and the optional video of one tutor lesson. */
export function LessonDetailsCard({ lesson, save }: { lesson: TutorLessonItem; save: SaveTutorLesson }) {
  const [title, setTitle] = useState(lesson.title || "")
  const [desc, setDesc] = useState(lesson.description || "")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState("")
  const [saving, setSaving] = useState(false)
  const hasVideo = !!(file || lesson.video_url)

  const pickFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  const saveDetails = async () => {
    if (!title.trim()) {
      toast.warning("กรุณากรอกชื่อบทเรียน")
      return
    }
    setSaving(true)
    try {
      const fields: Partial<TutorLessonItem> = { title: title.trim(), description: desc }
      if (file) {
        setProgress("กำลังอัปโหลดวิดีโอ…")
        const key = await uploadToStorage(file, `lessons/${lesson.id}/video`, "อัปโหลดไฟล์ไม่สำเร็จ ลองใหม่หรือเปลี่ยนชื่อไฟล์")
        Object.assign(fields, { video: true, video_url: key, video_path: key })
      }
      if (await save(fields)) {
        pickFile(null)
        toast.success("บันทึกบทเรียนแล้ว")
      }
    } catch (err: unknown) {
      toast.error("อัปโหลดวิดีโอไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
      setProgress("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายละเอียดบทเรียน</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FormField label="ชื่อบทเรียน" htmlFor="tw-title" required>
          <Input id="tw-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ภาวะหัวใจล้มเหลว" />
        </FormField>
        <FormField label="คำอธิบายบท" htmlFor="tw-desc">
          <Textarea id="tw-desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="สรุปสั้นๆ ว่าบทนี้ติวเรื่องอะไร นักศึกษาจะเห็นในหน้าบทเรียน" />
        </FormField>

        <div className="grid gap-2">
          <Label>วิดีโอประกอบ</Label>
          {(preview || lesson.video_url) && (
            <video src={preview || fileHref(lesson.video_url) || undefined} controls className="aspect-video w-full max-w-xl rounded-lg bg-black" />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <FilePickButton label="เลือกไฟล์วิดีโอ" accept="video/mp4,video/webm" variant="outline" disabled={saving} icon={<UploadIcon />} onFile={pickFile}>
              {hasVideo ? "เปลี่ยนวิดีโอ" : "เลือกไฟล์วิดีโอ"}
            </FilePickButton>
            <span className="max-w-xs truncate text-xs text-muted-foreground">
              {file ? `${file.name} · อัปโหลดเมื่อกดบันทึก` : lesson.video_url ? (lesson.video_path || lesson.video_url).split("/").pop() : "ยังไม่มีวิดีโอ (ไม่บังคับ)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={saveDetails} disabled={saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            {saving ? "กำลังบันทึก…" : "บันทึกบทเรียน"}
          </Button>
          {progress && <span className="text-xs text-primary">{progress}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
