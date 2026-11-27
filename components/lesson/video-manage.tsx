"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { toast } from "sonner"
import { CheckIcon, LoaderCircleIcon, UploadIcon, VideoIcon } from "lucide-react"
import { fileHref } from "@/lib/files"
import { FormField } from "@/components/common/form-field"
import { VideoPlayer } from "@/components/common/video-player"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FilePickButton } from "./file-pick-button"
import { SwitchRow } from "./switch-row"
import { errMsg, type LessonRow, type LessonUpdate, type OnSaveLesson } from "./types"
import { uploadToStorage } from "./upload"

export interface VideoManageHandle {
  getSavePayload: () => LessonUpdate
  hasTitle: () => boolean
}

/** "วิดีโอ" tab: video upload, title/description and the access switches for the other tabs. */
export const VideoManage = forwardRef<
  VideoManageHandle,
  {
    lesson: LessonRow
    onSave: OnSaveLesson
    onLessonChange: (fields: Partial<LessonRow>) => void
    showStatus?: boolean
  }
>(function VideoManage({ lesson, onSave, onLessonChange, showStatus = false }, ref) {
  const [title, setTitle] = useState(lesson.title || "")
  const [desc, setDesc] = useState(lesson.description || "")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const hasDocs = lesson.has_docs ?? true
  const hasPretest = lesson.has_pretest ?? true
  const hasPosttest = lesson.has_posttest ?? true
  const hasAssignment = lesson.has_assignment ?? true
  const allowAi = lesson.allow_ai ?? true

  useEffect(() => {
    setTitle(lesson.title || "")
    setDesc(lesson.description || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when another lesson is shown
  }, [lesson.id])

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const buildPayload = (): LessonUpdate => ({
    title,
    description: desc,
    duration: lesson.duration,
    status: lesson.status,
    has_docs: hasDocs,
    has_pretest: hasPretest,
    has_posttest: hasPosttest,
    has_assignment: hasAssignment,
    allow_ai: allowAi,
    video: lesson.video,
    video_url: lesson.video_url,
    video_path: lesson.video_path,
  })

  // The parent auto-saves the text fields when the user leaves this tab (no video upload).
  useImperativeHandle(ref, () => ({ getSavePayload: buildPayload, hasTitle: () => !!title }))

  const handleSave = async () => {
    if (!title) {
      toast.warning("กรุณากรอกชื่อบทเรียน")
      return
    }
    const payload = buildPayload()

    if (selectedFile) {
      setUploading(true)
      setProgress("กำลังเตรียมการอัปโหลด...")
      try {
        setProgress("กำลังอัปโหลดไฟล์วิดีโอ...")
        const key = await uploadToStorage(selectedFile, `lessons/${lesson.id}/video`, "Failed to upload video please upload agian or change name of video ")
        payload.video = true
        payload.video_url = key
        payload.video_path = key
        setProgress("อัปโหลดเสร็จสมบูรณ์")
        setSelectedFile(null)
      } catch (error: unknown) {
        console.error(error)
        toast.error("เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ: " + errMsg(error))
        setUploading(false)
        setProgress("")
        return // halt the save if the upload fails
      }
    }

    await onSave(payload)

    if (selectedFile) {
      setUploading(false)
      setProgress("")
    }
  }

  const displayFileName = selectedFile
    ? selectedFile.name
    : lesson.video
      ? lesson.video_path
        ? lesson.video_path.split("/").pop()
        : `${(lesson.title || "").toLowerCase().replace(/[^a-z0-9]/g, "_")}_lecture.mp4`
      : "ยังไม่ได้อัปโหลดวิดีโอ"
  const displayDetails = selectedFile ? "รอการบันทึกเพื่ออัปโหลด" : lesson.video ? `${lesson.duration || "30"} นาที · อัปโหลดแล้ว` : "ไม่มีวิดีโอการเรียนการสอน"
  const isDraftTitle = lesson.title === "บทเรียนใหม่" || lesson.title === ""

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>คลิปการสอน</CardTitle>
            <CardDescription>อัปโหลดหรือลิงก์วิดีโอบทเรียน</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {previewUrl || lesson.video_url ? (
              <VideoPlayer src={previewUrl || fileHref(lesson.video_url)} className="aspect-video w-full rounded-xl bg-black" />
            ) : (
              <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed bg-muted text-sm text-muted-foreground">วิดีโอบทเรียน · 16:9</div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                  <VideoIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{displayFileName}</div>
                  <div className="text-xs text-muted-foreground">{displayDetails}</div>
                </div>
              </div>
              <FilePickButton label="เลือกไฟล์วิดีโอ" accept="video/mp4,video/webm" variant="outline" disabled={uploading} icon={<UploadIcon />} onFile={setSelectedFile}>
                {selectedFile ? "เปลี่ยนวิดีโอ" : "เลือกไฟล์วิดีโอ"}
              </FilePickButton>
            </div>
            {progress && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <LoaderCircleIcon className="size-3 animate-spin" />
                {progress}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายละเอียดบทเรียน</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="ชื่อบทเรียน" htmlFor="lesson-title" required>
              <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น บทที่ 1 — ความรู้เบื้องต้น" />
            </FormField>
            <FormField label="คำอธิบาย" htmlFor="lesson-desc">
              <Textarea id="lesson-desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="คำอธิบายและหัวข้อในบทเรียนนี้…" />
            </FormField>
            {showStatus && (
              <FormField label="สถานะบทเรียน" htmlFor="lesson-status">
                <Select value={lesson.status || "draft"} onValueChange={(val) => onLessonChange({ status: val })}>
                  <SelectTrigger id="lesson-status" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">เผยแพร่แล้ว</SelectItem>
                    <SelectItem value="draft">ฉบับร่าง</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={handleSave} disabled={uploading}>
          {uploading ? <LoaderCircleIcon className="animate-spin" /> : <CheckIcon />}
          {uploading ? "กำลังบันทึกและอัปโหลด..." : isDraftTitle ? "สร้างบทเรียน" : "บันทึกรายละเอียด"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">การตั้งค่าการเข้าถึง</CardTitle>
        </CardHeader>
        <CardContent>
          <SwitchRow label="มีเอกสารประกอบการเรียน" on={hasDocs} onChange={(val) => onLessonChange({ has_docs: val })} />
          <SwitchRow label="มีข้อสอบ Pre-test" on={hasPretest} onChange={(val) => onLessonChange({ has_pretest: val })} />
          <SwitchRow label="มีข้อสอบ Post-test" on={hasPosttest} onChange={(val) => onLessonChange({ has_posttest: val })} />
          <SwitchRow label="มีใบงาน" on={hasAssignment} onChange={(val) => onLessonChange({ has_assignment: val })} />
          <SwitchRow label="เปิดให้ใช้ AI ในการสรุปและติว" on={allowAi} onChange={(val) => onLessonChange({ allow_ai: val })} />
        </CardContent>
      </Card>
    </div>
  )
})
