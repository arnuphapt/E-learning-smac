"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ChevronDownIcon, ChevronUpIcon, FolderIcon, SparklesIcon, Trash2Icon } from "lucide-react"
import { useConfirm } from "@/components/common/confirm"
import { DocsCard } from "@/components/lesson/docs-card"
import { formatBytes, uploadToStorage } from "@/components/lesson/upload"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { LessonBankCard } from "./lesson-bank-card"
import { LessonDetailsCard } from "./lesson-details-card"
import type { SaveTutorLesson, TutorLessonDoc, TutorLessonItem } from "./lesson-types"

type DocField = "documents" | "ai_documents"

interface LessonPanelProps {
  lesson: TutorLessonItem
  bank: { count: number; topics: number }
  save: SaveTutorLesson
  onMove: (delta: number) => void
  onDelete: () => void
  canUp: boolean
  canDown: boolean
}

// Everything an instructor edits for one tutor lesson: title/description/video, publish state, how many questions a
// round draws (with the "bank too small" warning), and the lesson's documents. The questions themselves live on the bank page.
// bank = { count, topics }; save(fields) writes the lesson row and resolves true on success.
export function LessonPanel({ lesson, bank, save, onMove, onDelete, canUp, canDown }: LessonPanelProps) {
  const confirm = useConfirm()
  const [uploading, setUploading] = useState<DocField | null>(null)
  const published = lesson.status === "active"

  const addDoc = async (field: DocField, folder: string, file: File) => {
    const docs = lesson[field] || []
    setUploading(field)
    try {
      const key = await uploadToStorage(file, `lessons/${lesson.id}/${folder}`, "อัปโหลดไฟล์ไม่สำเร็จ ลองใหม่หรือเปลี่ยนชื่อไฟล์")
      await save({ [field]: [...docs, { name: file.name, size: formatBytes(file.size), path: key, url: key }] })
    } catch (err: unknown) {
      toast.error("อัปโหลดไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(null)
    }
  }

  const removeDoc = async (field: DocField, doc: TutorLessonDoc) => {
    const ok = await confirm({ title: "ลบเอกสาร", message: `ลบ “${doc.name}” ออกจากบทนี้ใช่หรือไม่?`, danger: true, confirmText: "ลบเอกสาร", cancelText: "ยกเลิก" })
    if (ok) await save({ [field]: (lesson[field] || []).filter((d) => d !== doc) })
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold tabular-nums text-muted-foreground">บทที่ {lesson.index}</div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="สถานะบทเรียน"
            value={published ? "active" : "draft"}
            onValueChange={(v) => {
              if (v === "active" && !published) save({ status: "active" })
              if (v === "draft" && published) save({ status: "draft" })
            }}
          >
            <ToggleGroupItem value="active">เผยแพร่</ToggleGroupItem>
            <ToggleGroupItem value="draft">ฉบับร่าง</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="icon" disabled={!canUp} onClick={() => onMove(-1)} aria-label="เลื่อนบทขึ้น" title="เลื่อนขึ้น">
            <ChevronUpIcon />
          </Button>
          <Button variant="outline" size="icon" disabled={!canDown} onClick={() => onMove(1)} aria-label="เลื่อนบทลง" title="เลื่อนลง">
            <ChevronDownIcon />
          </Button>
          <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={onDelete} aria-label="ลบบทเรียน" title="ลบบทเรียน">
            <Trash2Icon />
          </Button>
        </div>
      </div>

      <LessonDetailsCard lesson={lesson} save={save} />
      <LessonBankCard lesson={lesson} bank={bank} save={save} />

      <DocsCard
        title="เอกสารประกอบสำหรับนักศึกษา"
        description="PDF, Word, PowerPoint, รูปภาพ"
        uploadLabel="เพิ่มไฟล์"
        uploadingLabel="กำลังอัปโหลด…"
        uploadAriaLabel="เพิ่มเอกสารสำหรับนักศึกษา"
        uploading={uploading === "documents"}
        docs={lesson.documents || []}
        emptyIcon={<FolderIcon />}
        emptyText="ยังไม่มีเอกสาร"
        onUpload={(f) => addDoc("documents", "documents", f)}
        onDelete={(d) => removeDoc("documents", d)}
      />
      <DocsCard
        title={
          <>
            <SparklesIcon className="size-4 text-primary" />
            เอกสารสำหรับ AI (นักศึกษาไม่เห็น)
          </>
        }
        description="ให้ AI ติวเตอร์ใช้ตอบคำถามเชิงลึกของบทนี้"
        uploadLabel="เพิ่มไฟล์"
        uploadingLabel="กำลังอัปโหลด…"
        uploadAriaLabel="เพิ่มเอกสารสำหรับ AI"
        uploading={uploading === "ai_documents"}
        docs={lesson.ai_documents || []}
        emptyIcon={<SparklesIcon />}
        emptyText="ยังไม่มีเอกสาร AI ใช้ข้อมูลบทเรียนปกติ"
        onUpload={(f) => addDoc("ai_documents", "ai_documents", f)}
        onDelete={(d) => removeDoc("ai_documents", d)}
      />
    </div>
  )
}
