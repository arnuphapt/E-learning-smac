"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  BookOpenIcon,
  CheckIcon,
  ClipboardListIcon,
  FileIcon,
  FolderIcon,
  Loader2Icon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
  VideoIcon,
} from "lucide-react"
import { fileHref } from "@/lib/files"
import { parseTimeLimit, roundMinutes, TIME_LIMIT_MAX } from "@/lib/tutor-attempt"
import { bankWarning, parseDrawCount } from "@/lib/tutor-bank"
import { roundSize } from "@/lib/tutor-draw"
import { useConfirm } from "@/components/common/confirm"
import { FormField } from "@/components/common/form-field"
import { ToneBadge } from "@/components/common/status-badge"
import { FilePickButton } from "@/components/lesson/file-pick-button"
import { formatBytes, uploadToStorage } from "@/components/lesson/upload"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { TutorLessonDoc, TutorLessonItem } from "./lesson-types"
import type { BankStats, WorkspaceLesson } from "./workspace-data"

type TutorModalTab = "main" | "bank" | "docs"
type DocField = "documents" | "ai_documents"

/** Modal editor for one tutor lesson: matches LessonWizardDialog (sticky header/tabs/footer, flat sections). */
export function TutorLessonDialog({
  courseCode,
  lesson,
  bank,
  onCreate,
  onSave,
  onClose,
}: {
  courseCode?: string | null
  lesson: WorkspaceLesson | null
  bank: BankStats
  onCreate: (fields: { title: string; description: string; status: string }) => Promise<WorkspaceLesson | null>
  onSave: (lessonId: string, fields: Partial<TutorLessonItem>) => Promise<boolean>
  onClose: () => void
}) {
  const confirm = useConfirm()
  const [tab, setTab] = useState<TutorModalTab>("main")
  const [title, setTitle] = useState(lesson?.title || "")
  const [titleError, setTitleError] = useState<string | null>(null)
  const [description, setDescription] = useState(lesson?.description || "")
  const [status, setStatus] = useState(lesson?.status || "draft")

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const videoPreview = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : null), [videoFile])

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    }
  }, [videoPreview])

  const [whole, setWhole] = useState(lesson?.tutor_draw_count == null)
  const [drawInput, setDrawInput] = useState(lesson?.tutor_draw_count == null ? "" : String(lesson.tutor_draw_count))
  const [timeInput, setTimeInput] = useState(lesson?.tutor_time_limit_minutes == null ? "" : String(lesson.tutor_time_limit_minutes))
  const [uploadingDoc, setUploadingDoc] = useState<DocField | null>(null)

  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved">("idle")
  const [busy, setBusy] = useState(false)

  const tabs = useMemo(() => {
    if (!lesson) return []
    const docsCount = (lesson.documents?.length || 0) + (lesson.ai_documents?.length || 0)
    return [
      { key: "main" as const, label: "ข้อมูลหลักและวิดีโอ", icon: <VideoIcon /> },
      { key: "bank" as const, label: "คลังข้อสอบและการสอบ", icon: <ClipboardListIcon />, hint: String(bank.count) },
      { key: "docs" as const, label: "เอกสาร", icon: <FolderIcon />, hint: docsCount > 0 ? String(docsCount) : undefined },
    ]
  }, [lesson, bank.count])

  const activeTab: TutorModalTab = lesson ? tab : "main"

  const saveBasicsIfDirty = async () => {
    if (!lesson) return true
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError("กรุณากรอกชื่อหมวดติว")
      return false
    }
    setTitleError(null)
    if (trimmed !== (lesson.title || "") || description !== (lesson.description || "")) {
      setSaveState("saving")
      const ok = await onSave(lesson.id, { title: trimmed, description })
      setSaveState(ok ? "saved" : "dirty")
      return ok
    }
    return true
  }

  const handleTabChange = async (next: string) => {
    const nextTab = next as TutorModalTab
    if (nextTab === activeTab || busy || !lesson) return
    setBusy(true)
    try {
      if (activeTab === "main") {
        const ok = await saveBasicsIfDirty()
        if (!ok) return
      }
      setTab(nextTab)
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async () => {
    if (busy) return
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError("กรุณากรอกชื่อหมวดติว")
      return
    }
    setTitleError(null)
    setBusy(true)
    setSaveState("saving")
    try {
      const created = await onCreate({ title: trimmed, description, status })
      if (created) {
        setSaveState("saved")
        setTab("main")
      } else {
        setSaveState("dirty")
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDone = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (activeTab === "main") {
        const ok = await saveBasicsIfDirty()
        if (!ok) return
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleUploadVideo = async () => {
    if (!lesson || !videoFile || uploadingVideo) return
    setUploadingVideo(true)
    setSaveState("saving")
    try {
      const key = await uploadToStorage(videoFile, `lessons/${lesson.id}/video`, "อัปโหลดไฟล์ไม่สำเร็จ ลองใหม่หรือเปลี่ยนชื่อไฟล์")
      const ok = await onSave(lesson.id, { video: true, video_url: key, video_path: key })
      if (ok) {
        setVideoFile(null)
        setSaveState("saved")
        toast.success("อัปโหลดวิดีโอเรียบร้อยแล้ว")
      } else {
        setSaveState("dirty")
      }
    } catch (err: unknown) {
      setSaveState("dirty")
      toast.error("อัปโหลดวิดีโอไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleRemoveVideo = async () => {
    if (!lesson || uploadingVideo) return
    setVideoFile(null)
    setSaveState("saving")
    const ok = await onSave(lesson.id, { video: false, video_url: null, video_path: null })
    setSaveState(ok ? "saved" : "dirty")
    if (ok) toast.success("ลบวิดีโอแล้ว")
  }

  const draftDraw = whole ? null : parseDrawCount(drawInput)
  const drawWarning = bankWarning(bank.count, draftDraw ?? null)
  const defaultMinutes = roundMinutes(roundSize(bank.count, whole ? null : draftDraw ?? lesson?.tutor_draw_count ?? null))
  const once = lesson?.tutor_max_attempts === 1

  const saveDraw = async () => {
    if (!lesson) return
    const value = whole ? null : parseDrawCount(drawInput)
    if (!whole && !value) {
      toast.error("กรุณากรอกจำนวนข้อต่อรอบเป็นเลขจำนวนเต็มมากกว่า 0 หรือเลือก “ใช้ทั้งคลัง”")
      return
    }
    setSaveState("saving")
    const ok = await onSave(lesson.id, { tutor_draw_count: value })
    setSaveState(ok ? "saved" : "dirty")
    if (ok) toast.success("บันทึกจำนวนข้อต่อรอบแล้ว")
  }

  const saveTime = async () => {
    if (!lesson) return
    const value = parseTimeLimit(timeInput)
    if (value === undefined) {
      toast.error(`เวลาต่อรอบต้องเป็นเลขจำนวนเต็ม 1 ถึง ${TIME_LIMIT_MAX} นาที หรือเว้นว่างเพื่อใช้ค่าเริ่มต้น`)
      return
    }
    setSaveState("saving")
    const ok = await onSave(lesson.id, { tutor_time_limit_minutes: value })
    setSaveState(ok ? "saved" : "dirty")
    if (ok) toast.success(value == null ? "ใช้เวลาค่าเริ่มต้นแล้ว" : "บันทึกเวลาต่อรอบแล้ว")
  }

  const saveAttempts = async (value: number | null) => {
    if (!lesson) return
    setSaveState("saving")
    const ok = await onSave(lesson.id, { tutor_max_attempts: value })
    setSaveState(ok ? "saved" : "dirty")
    if (ok) toast.success(value === 1 ? "ตั้งเป็นทำได้ครั้งเดียวแล้ว" : "ตั้งเป็นทำซ้ำได้แล้ว")
  }

  const addDoc = async (field: DocField, folder: string, file: File) => {
    if (!lesson) return
    const docs = lesson[field] || []
    setUploadingDoc(field)
    setSaveState("saving")
    try {
      const key = await uploadToStorage(file, `lessons/${lesson.id}/${folder}`, "อัปโหลดไฟล์ไม่สำเร็จ ลองใหม่หรือเปลี่ยนชื่อไฟล์")
      const ok = await onSave(lesson.id, { [field]: [...docs, { name: file.name, size: formatBytes(file.size), path: key, url: key }] })
      setSaveState(ok ? "saved" : "dirty")
      if (ok) toast.success("อัปโหลดเอกสารสำเร็จ")
    } catch (err: unknown) {
      setSaveState("dirty")
      toast.error("อัปโหลดไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploadingDoc(null)
    }
  }

  const removeDoc = async (field: DocField, doc: TutorLessonDoc) => {
    if (!lesson) return
    const okConfirm = await confirm({
      title: "ลบเอกสาร",
      message: `ลบ “${doc.name}” ออกจากหมวดนี้ใช่หรือไม่?`,
      danger: true,
      confirmText: "ลบเอกสาร",
      cancelText: "ยกเลิก",
    })
    if (!okConfirm) return
    setSaveState("saving")
    const ok = await onSave(lesson.id, { [field]: (lesson[field] || []).filter((d) => d !== doc) })
    setSaveState(ok ? "saved" : "dirty")
    if (ok) toast.success("ลบเอกสารแล้ว")
  }

  const activeVideoSrc = videoPreview || fileHref(lesson?.video_url) || undefined
  const currentVideoName = videoFile
    ? videoFile.name
    : lesson?.video_path
      ? lesson.video_path.split("/").pop()
      : lesson?.video_url || null

  const saveLabel =
    saveState === "saving"
      ? "กำลังบันทึก…"
      : saveState === "dirty"
        ? "มีการแก้ไขที่ยังไม่บันทึก"
        : saveState === "saved"
          ? "บันทึกแล้ว"
          : lesson
            ? "พร้อมแก้ไข"
            : "กรอกข้อมูลเพื่อสร้างหมวดติว"

  const headerTitle = lesson ? title.trim() || lesson.title || "แก้ไขหมวดติว" : "สร้างหมวดติวใหม่"
  const headerDesc = courseCode
    ? `${courseCode}${lesson ? ` · หมวดที่ ${lesson.index}` : ""}`
    : "กรอกข้อมูลพื้นฐาน จากนั้นจึงเพิ่มวิดีโอ คลังข้อสอบ และเอกสารได้"

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && !uploadingVideo && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border/80 bg-card px-6 py-4 pr-14 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {lesson ? (
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-semibold tabular-nums text-primary-soft-foreground">
                  {String(lesson.index ?? 1).padStart(2, "0")}
                </div>
              ) : (
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <BookOpenIcon className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold tracking-tight">{headerTitle}</DialogTitle>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <DialogDescription className={courseCode ? "font-mono text-xs text-muted-foreground" : "text-xs text-muted-foreground"}>
                    {headerDesc}
                  </DialogDescription>
                  {lesson && (
                    <ToneBadge tone={status === "active" ? "success" : "muted"}>
                      {status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                    </ToneBadge>
                  )}
                </div>
              </div>
            </div>
            {lesson && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/i/lesson/${lesson.id}/bank`}>
                  <ClipboardListIcon />
                  เปิดคลังข้อสอบ
                </Link>
              </Button>
            )}
          </div>
        </DialogHeader>

        {lesson && tabs.length > 1 && (
          <div className="shrink-0 overflow-x-auto border-b border-border/80 bg-muted/30 px-6">
            <Tabs value={activeTab} onValueChange={(v) => void handleTabChange(v)}>
              <TabsList variant="line" className="h-11 gap-2 p-0">
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    className="h-11 rounded-none px-3 text-sm after:bottom-0 after:bg-primary data-[state=active]:text-primary"
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {t.hint && (
                      <span className="ml-1 rounded-full border border-border/80 bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                        {t.hint}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="modal-scroll flex-1 overflow-y-auto bg-card px-6 py-5">
          {activeTab === "main" && (
            <div className="grid gap-6">
              <section className="grid gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">ข้อมูลพื้นฐาน</h3>
                  <p className="text-xs text-muted-foreground">กำหนดชื่อ คำอธิบาย และสถานะการเผยแพร่ของหมวดติวในชุดนี้</p>
                </div>

                <FormField label="ชื่อหมวดติว" htmlFor="tutor-lesson-title" required error={titleError}>
                  <Input
                    id="tutor-lesson-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (titleError) setTitleError(null)
                      if (lesson) setSaveState("dirty")
                    }}
                    onBlur={() => {
                      if (lesson) void saveBasicsIfDirty()
                    }}
                    placeholder="เช่น ภาวะหัวใจล้มเหลว"
                    autoFocus={!lesson}
                  />
                </FormField>

                <FormField label="คำอธิบายหมวดติว" htmlFor="tutor-lesson-desc">
                  <Textarea
                    id="tutor-lesson-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      if (lesson) setSaveState("dirty")
                    }}
                    onBlur={() => {
                      if (lesson) void saveBasicsIfDirty()
                    }}
                    placeholder="สรุปสั้นๆ ว่าหมวดนี้ติวเรื่องอะไร นักศึกษาจะเห็นในหน้าหมวดติว"
                  />
                </FormField>

                <div className="grid gap-2">
                  <Label>สถานะหมวดติว</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={status}
                      onValueChange={(val) => {
                        if (!val) return
                        setStatus(val)
                        if (lesson) {
                          setSaveState("saving")
                          void onSave(lesson.id, { status: val }).then((ok) => setSaveState(ok ? "saved" : "dirty"))
                        }
                      }}
                    >
                      <ToggleGroupItem
                        value="draft"
                        className="gap-2 data-[state=on]:border-primary/40 data-[state=on]:bg-primary-soft/60 data-[state=on]:font-semibold data-[state=on]:text-primary-soft-foreground"
                      >
                        <span aria-hidden className="size-2 rounded-full bg-muted-foreground/60" />
                        ฉบับร่าง
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="active"
                        className="gap-2 data-[state=on]:border-primary/40 data-[state=on]:bg-primary-soft/60 data-[state=on]:font-semibold data-[state=on]:text-primary-soft-foreground"
                      >
                        <span aria-hidden className="size-2 rounded-full bg-success" />
                        เผยแพร่
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <span className="text-xs text-muted-foreground">
                      {status === "active" ? "เผยแพร่แล้ว — นักศึกษาที่มีสิทธิ์จะเห็นหมวดติวนี้" : "ฉบับร่าง — มองเห็นเฉพาะอาจารย์ผู้สอน"}
                    </span>
                  </div>
                </div>
              </section>

              {lesson && (
                <>
                  <Separator />
                  <section className="grid gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">วิดีโอประกอบหมวดติว</h3>
                      <p className="text-xs text-muted-foreground">อัปโหลดไฟล์วิดีโอสำหรับหมวดนี้ (ไม่บังคับ)</p>
                    </div>

                    {activeVideoSrc && (
                      <div className="grid gap-2">
                        <video src={activeVideoSrc} controls className="aspect-video w-full rounded-xl bg-black" />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{currentVideoName ?? "วิดีโอที่บันทึกไว้"}</span>
                          {lesson.video_url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleRemoveVideo()}
                              disabled={uploadingVideo}
                            >
                              <Trash2Icon />
                              ลบวิดีโอ
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/25 p-6 text-center">
                      <div className="grid size-11 place-items-center rounded-full bg-muted text-primary">
                        <VideoIcon className="size-5" />
                      </div>
                      <div className="grid gap-1">
                        <p className="text-sm font-medium">{videoFile ? videoFile.name : "เลือกไฟล์วิดีโอ MP4 หรือ WebM"}</p>
                        <p className="text-xs text-muted-foreground">
                          {videoFile ? "กดปุ่มด้านล่างเพื่ออัปโหลดและบันทึก" : "รองรับไฟล์ .mp4 และ .webm"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <FilePickButton
                          label="เลือกไฟล์วิดีโอ"
                          accept="video/mp4,video/webm"
                          variant="outline"
                          disabled={uploadingVideo}
                          icon={<UploadIcon />}
                          onFile={setVideoFile}
                        >
                          {videoFile ? "เปลี่ยนไฟล์" : lesson.video_url ? "เปลี่ยนวิดีโอ" : "เลือกไฟล์วิดีโอ"}
                        </FilePickButton>
                        {videoFile && (
                          <Button type="button" onClick={() => void handleUploadVideo()} disabled={uploadingVideo}>
                            {uploadingVideo ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
                            {uploadingVideo ? "กำลังอัปโหลด…" : "อัปโหลดและบันทึกวิดีโอ"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {lesson && activeTab === "bank" && (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/25 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">คลังข้อสอบของหมวดนี้</div>
                  <div className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                    {bank.count} <span className="text-sm font-medium text-muted-foreground">ข้อ · {bank.topics} หัวข้อ</span>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/i/lesson/${lesson.id}/bank`}>
                    <ClipboardListIcon />
                    เปิดคลังข้อสอบ
                  </Link>
                </Button>
              </div>

              <div className="grid gap-2.5">
                <Label htmlFor="tutor-modal-draw">จำนวนข้อต่อรอบ</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Label htmlFor="tutor-modal-whole" className="cursor-pointer font-normal">
                    <Checkbox id="tutor-modal-whole" checked={whole} onCheckedChange={(v) => setWhole(v === true)} />
                    ใช้ทั้งคลัง
                  </Label>
                  <Input
                    id="tutor-modal-draw"
                    className="w-28 tabular-nums"
                    inputMode="numeric"
                    value={drawInput}
                    disabled={whole}
                    onChange={(e) => setDrawInput(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="เช่น 20"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => void saveDraw()}>
                    <CheckIcon />
                    บันทึกจำนวนข้อ
                  </Button>
                </div>
                {drawWarning && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                    <span>คลังไม่พอ: {drawWarning}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid gap-2.5">
                <Label htmlFor="tutor-modal-time">เวลาต่อรอบ (นาที)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id="tutor-modal-time"
                    className="w-28 tabular-nums"
                    inputMode="numeric"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder={`ค่าเริ่มต้น: ${defaultMinutes}`}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => void saveTime()}>
                    <CheckIcon />
                    บันทึกเวลา
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    เว้นว่าง = 1 นาทีต่อข้อ ({defaultMinutes} นาที) · นับรวมทั้งรอบ ไม่เกิน {TIME_LIMIT_MAX} นาที
                  </span>
                </div>
              </div>

              <Separator />

              <div className="grid gap-2.5">
                <Label id="tutor-modal-attempts-label">จำนวนครั้งที่นักศึกษาทำได้</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  aria-labelledby="tutor-modal-attempts-label"
                  value={once ? "once" : "repeat"}
                  onValueChange={(v) => {
                    if (v === "repeat" && once) void saveAttempts(null)
                    if (v === "once" && !once) void saveAttempts(1)
                  }}
                >
                  <ToggleGroupItem value="repeat">ทำซ้ำได้</ToggleGroupItem>
                  <ToggleGroupItem value="once">ทำได้ครั้งเดียว</ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">
                  {once ? "นับทุกรอบที่เริ่มทำ แม้ยังไม่ส่งหรือหมดเวลา เมื่อทำครบแล้วนักศึกษาเริ่มรอบใหม่ไม่ได้" : "นักศึกษาเริ่มรอบใหม่ได้ไม่จำกัด"}
                </p>
              </div>
            </div>
          )}

          {lesson && activeTab === "docs" && (
            <div className="grid gap-5">
              <p className="text-xs text-muted-foreground">
                เอกสารประกอบสำหรับนักศึกษาจะแสดงในหน้าหมวดติว ส่วนเอกสารสำหรับ AI ใช้เป็นคลังความรู้เบื้องหลังเท่านั้น (นักศึกษาจะไม่เห็น)
              </p>

              {(
                [
                  {
                    field: "documents" as const,
                    folder: "documents",
                    icon: <FolderIcon className="size-4 text-primary" />,
                    title: "เอกสารประกอบสำหรับนักศึกษา",
                    uploadLabel: "เพิ่มไฟล์",
                    docs: lesson.documents || [],
                  },
                  {
                    field: "ai_documents" as const,
                    folder: "ai_documents",
                    icon: <SparklesIcon className="size-4 text-primary" />,
                    title: "เอกสารสำหรับ AI (นักศึกษาไม่เห็น)",
                    uploadLabel: "เพิ่มไฟล์ AI",
                    docs: lesson.ai_documents || [],
                  },
                ] as const
              ).map((sec, idx) => (
                <div key={sec.field} className="grid gap-5">
                  {idx > 0 && <Separator />}
                  <section className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        {sec.icon}
                        {sec.title}
                      </h3>
                      <FilePickButton
                        label={sec.uploadLabel}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                        variant="outline"
                        size="sm"
                        disabled={uploadingDoc === sec.field}
                        icon={uploadingDoc === sec.field ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
                        onFile={(f) => void addDoc(sec.field, sec.folder, f)}
                      >
                        {uploadingDoc === sec.field ? "กำลังอัปโหลด…" : sec.uploadLabel}
                      </FilePickButton>
                    </div>

                    {sec.docs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">
                        ยังไม่มีไฟล์ในส่วนนี้
                      </div>
                    ) : (
                      <ul className="divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
                        {sec.docs.map((doc, i) => (
                          <li key={`${doc.path ?? doc.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <FileIcon className="size-4 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{doc.name}</div>
                                <div className="text-xs text-muted-foreground">{doc.size}</div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0 text-destructive hover:text-destructive"
                              aria-label={`ลบเอกสาร ${doc.name}`}
                              onClick={() => void removeDoc(sec.field, doc)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/35 px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            {saveState === "saving" ? (
              <Loader2Icon className="size-3.5 animate-spin text-primary" />
            ) : saveState === "dirty" ? (
              <span aria-hidden className="size-2 rounded-full bg-warning" />
            ) : saveState === "saved" ? (
              <span aria-hidden className="size-2 rounded-full bg-success" />
            ) : (
              <span aria-hidden className="size-2 rounded-full bg-muted-foreground/40" />
            )}
            <span>{saveLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {!lesson ? (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                  ยกเลิก
                </Button>
                <Button type="button" onClick={() => void handleCreate()} disabled={busy}>
                  {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                  สร้างหมวดติว
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => void handleDone()} disabled={busy || uploadingVideo}>
                {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                เสร็จสิ้น
              </Button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
