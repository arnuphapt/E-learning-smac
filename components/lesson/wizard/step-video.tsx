"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { toast } from "sonner"
import { LinkIcon, LoaderCircleIcon, Trash2Icon, UploadIcon, VideoIcon } from "lucide-react"
import { fileHref } from "@/lib/files"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FilePickButton } from "@/components/lesson/file-pick-button"
import { errMsg, type LessonRow, type LessonUpdate } from "@/components/lesson/types"
import { uploadToStorage } from "@/components/lesson/upload"

export interface StepVideoHandle {
  flushPending: () => Promise<void>
}

/** Step 2: upload a lesson video file or link an external video URL. */
export const StepVideo = forwardRef<
  StepVideoHandle,
  {
    lesson: LessonRow
    onSave: (fields: LessonUpdate, silent?: boolean) => Promise<void>
    onMarkDirty: () => void
  }
>(function StepVideo({ lesson, onSave, onMarkDirty }, ref) {
  const initialIsExternal = Boolean(lesson.video_url && !lesson.video_path && /^https?:\/\//i.test(lesson.video_url))
  const [sourceMode, setSourceMode] = useState<"upload" | "url">(initialIsExternal ? "url" : "upload")
  const [videoUrl, setVideoUrl] = useState(initialIsExternal ? lesson.video_url || "" : "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const saveUrl = async (silent = false) => {
    if (sourceMode !== "url") return
    const trimmed = videoUrl.trim()
    const current = lesson.video_url || ""
    if (trimmed === current && Boolean(trimmed) === Boolean(lesson.video)) return
    await onSave(
      {
        video: Boolean(trimmed),
        video_url: trimmed || null,
        video_path: null,
      },
      silent,
    )
  }

  useImperativeHandle(ref, () => ({
    flushPending: () => saveUrl(true),
  }))

  const handleUpload = async () => {
    if (!selectedFile || uploading) return
    setUploading(true)
    setUploadPct(25)
    try {
      const key = await uploadToStorage(selectedFile, `lessons/${lesson.id}/video`, "Failed to upload video please upload agian or change name of video ")
      setUploadPct(90)
      await onSave({ video: true, video_url: key, video_path: key }, false)
      setUploadPct(100)
      setSelectedFile(null)
    } catch (error: unknown) {
      console.error(error)
      toast.error("เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ: " + errMsg(error))
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveVideo = async () => {
    setSelectedFile(null)
    setVideoUrl("")
    await onSave({ video: false, video_url: null, video_path: null }, false)
  }

  const activePreview = previewUrl || fileHref(lesson.video_url) || undefined
  const currentName = selectedFile
    ? selectedFile.name
    : lesson.video_path
      ? lesson.video_path.split("/").pop()
      : lesson.video_url || null

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">วิดีโอบทเรียน</h3>
          <p className="text-xs text-muted-foreground">อัปโหลดไฟล์วิดีโอหรือวางลิงก์วิดีโอสำหรับบทเรียนนี้</p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={sourceMode}
          onValueChange={(v) => {
            if (v === "upload" || v === "url") setSourceMode(v)
          }}
        >
          <ToggleGroupItem value="upload">
            <UploadIcon />
            อัปโหลดไฟล์
          </ToggleGroupItem>
          <ToggleGroupItem value="url">
            <LinkIcon />
            ลิงก์วิดีโอ
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {activePreview && (
        <div className="grid gap-2">
          <video src={activePreview} controls className="aspect-video w-full rounded-xl bg-black" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{currentName ?? "วิดีโอที่บันทึกไว้"}</span>
            {lesson.video && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleRemoveVideo} disabled={uploading}>
                <Trash2Icon />
                ลบวิดีโอ
              </Button>
            )}
          </div>
        </div>
      )}

      <Separator />

      {sourceMode === "upload" ? (
        <div className="grid gap-3">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-muted text-primary">
              <VideoIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">{selectedFile ? selectedFile.name : "เลือกไฟล์วิดีโอ MP4 หรือ WebM"}</p>
              <p className="text-xs text-muted-foreground">
                {selectedFile ? "กดปุ่มด้านล่างเพื่ออัปโหลดและบันทึก" : "รองรับไฟล์ .mp4 และ .webm"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <FilePickButton label="เลือกไฟล์วิดีโอ" accept="video/mp4,video/webm" variant="outline" disabled={uploading} icon={<UploadIcon />} onFile={setSelectedFile}>
                {selectedFile ? "เปลี่ยนไฟล์" : "เลือกไฟล์วิดีโอ"}
              </FilePickButton>
              {selectedFile && (
                <Button type="button" onClick={handleUpload} disabled={uploading}>
                  {uploading ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
                  {uploading ? "กำลังอัปโหลด…" : "อัปโหลดและบันทึกวิดีโอ"}
                </Button>
              )}
            </div>
          </div>

          {uploading && (
            <div className="grid gap-1.5">
              <Progress value={uploadPct} />
              <p className="text-xs text-muted-foreground">กำลังอัปโหลดไฟล์วิดีโอไปยังคลังจัดเก็บ…</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <FormField label="ลิงก์วิดีโอ" htmlFor="wizard-video-url" description="วาง URL ของไฟล์วิดีโอที่โฮสต์ไว้ภายนอก">
            <Input
              id="wizard-video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value)
                onMarkDirty()
              }}
              onBlur={() => void saveUrl(true)}
              placeholder="https://example.com/lesson.mp4"
            />
          </FormField>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => void saveUrl(false)}>
              บันทึกลิงก์วิดีโอ
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
