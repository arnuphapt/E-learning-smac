"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileIcon, FolderIcon, LoaderCircleIcon, SparklesIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { useConfirm } from "@/components/common/confirm"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FilePickButton } from "@/components/lesson/file-pick-button"
import { SwitchRow } from "@/components/lesson/switch-row"
import { errMsg, parseDocs, type DocItem, type LessonRow, type LessonUpdate } from "@/components/lesson/types"
import { formatBytes, uploadToStorage } from "@/components/lesson/upload"

type DocField = "documents" | "ai_documents"

/** Step 3: student & AI reference documents plus download toggle (flat, no cards). */
export function StepDocs({
  lesson,
  onSave,
}: {
  lesson: LessonRow
  onSave: (fields: LessonUpdate, silent?: boolean) => Promise<void>
}) {
  const confirm = useConfirm()
  const [uploading, setUploading] = useState<Record<DocField, boolean>>({ documents: false, ai_documents: false })
  const docsByField: Record<DocField, DocItem[]> = {
    documents: parseDocs(lesson.documents),
    ai_documents: parseDocs(lesson.ai_documents),
  }

  const upload = async (field: DocField, file: File, successText: string) => {
    setUploading((u) => ({ ...u, [field]: true }))
    try {
      const key = await uploadToStorage(file, `lessons/${lesson.id}/${field}`)
      const updated = [...docsByField[field], { name: file.name, size: formatBytes(file.size), path: key, url: key }]
      await onSave({ [field]: updated }, true)
      toast.success(successText)
    } catch (error: unknown) {
      console.error(error)
      toast.error("เกิดข้อผิดพลาดในการอัปโหลด: " + errMsg(error))
    } finally {
      setUploading((u) => ({ ...u, [field]: false }))
    }
  }

  const remove = async (field: DocField, doc: DocItem, title: string, message: string, successText: string) => {
    const confirmed = await confirm({ title, message, danger: true, confirmText: "ลบเอกสาร", cancelText: "ยกเลิก" })
    if (!confirmed) return
    try {
      const updated = docsByField[field].filter((d) => d.path !== doc.path || d.name !== doc.name)
      await onSave({ [field]: updated }, true)
      toast.success(successText)
    } catch (error: unknown) {
      console.error(error)
      toast.error("เกิดข้อผิดพลาดในการลบ: " + errMsg(error))
    }
  }

  const renderSection = ({
    field,
    icon,
    title,
    uploadLabel,
    docs,
    onUpload,
    onDelete,
  }: {
    field: DocField
    icon: React.ReactNode
    title: string
    uploadLabel: string
    docs: DocItem[]
    onUpload: (file: File) => void
    onDelete: (doc: DocItem) => void
  }) => (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <FilePickButton
          label={uploadLabel}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
          variant="outline"
          size="sm"
          disabled={uploading[field]}
          icon={uploading[field] ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
          onFile={onUpload}
        >
          {uploading[field] ? "กำลังอัปโหลด…" : uploadLabel}
        </FilePickButton>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
          ยังไม่มีไฟล์ในส่วนนี้
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {docs.map((doc, idx) => (
            <li key={`${doc.path ?? doc.name}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
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
                onClick={() => onDelete(doc)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  return (
    <div className="grid gap-5">
      <p className="text-xs text-muted-foreground">
        เอกสารทั่วไปจะแสดงให้นักศึกษาเห็นและศึกษาในบทเรียน ส่วนเอกสารสำหรับ AI ใช้เป็นคลังความรู้เบื้องหลังเท่านั้น (นักศึกษาจะไม่เห็น)
      </p>

      {renderSection({
        field: "documents",
        icon: <FolderIcon className="size-4 text-primary" />,
        title: "เอกสารประกอบการเรียน (สำหรับนักศึกษา)",
        uploadLabel: "อัปโหลดเอกสาร",
        docs: docsByField.documents,
        onUpload: (file) => void upload("documents", file, "อัปโหลดเอกสารสำเร็จ"),
        onDelete: (doc) => void remove("documents", doc, "ลบเอกสารประกอบการเรียน", `คุณต้องการลบเอกสาร "${doc.name}" ใช่หรือไม่?`, "ลบเอกสารสำเร็จ"),
      })}

      <Separator />

      {renderSection({
        field: "ai_documents",
        icon: <SparklesIcon className="size-4 text-primary" />,
        title: "เอกสารประกอบความรู้สำหรับ AI",
        uploadLabel: "อัปโหลดเอกสาร AI",
        docs: docsByField.ai_documents,
        onUpload: (file) => void upload("ai_documents", file, "อัปโหลดเอกสารสำหรับ AI สำเร็จ"),
        onDelete: (doc) => void remove("ai_documents", doc, "ลบเอกสารสำหรับ AI", `คุณต้องการลบเอกสารสำหรับ AI "${doc.name}" ใช่หรือไม่?`, "ลบเอกสารสำหรับ AI สำเร็จ"),
      })}

      <Separator />

      <SwitchRow
        label="อนุญาตให้นักศึกษาดาวน์โหลดเอกสาร"
        on={lesson.allow_download ?? true}
        onChange={(val) => void onSave({ allow_download: val }, true)}
      />
    </div>
  )
}
