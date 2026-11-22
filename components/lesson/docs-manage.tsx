"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FolderIcon, SparklesIcon } from "lucide-react"
import type { Json } from "@/lib/database.types"
import { useConfirm } from "@/components/common/confirm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocsCard } from "./docs-card"
import { SwitchRow } from "./switch-row"
import { errMsg, parseDocs, type DocItem, type LessonRow, type OnSaveLesson } from "./types"
import { formatBytes, uploadToStorage } from "./upload"

type DocField = "documents" | "ai_documents"

/** "เอกสารประกอบ" tab: student documents, AI-only reference documents and the download switch. */
export function DocsManage({ lesson, onSave }: { lesson: LessonRow; onSave: OnSaveLesson }) {
  const confirm = useConfirm()
  const [uploading, setUploading] = useState<Record<DocField, boolean>>({ documents: false, ai_documents: false })
  const docsByField: Record<DocField, DocItem[]> = { documents: parseDocs(lesson.documents), ai_documents: parseDocs(lesson.ai_documents) }

  const upload = async (field: DocField, file: File, successText: string) => {
    setUploading((u) => ({ ...u, [field]: true }))
    try {
      const key = await uploadToStorage(file, `lessons/${lesson.id}/${field}`)
      const updated = [...docsByField[field], { name: file.name, size: formatBytes(file.size), path: key, url: key }]
      await onSave({ [field]: updated as unknown as Json })
      toast.success(successText)
    } catch (error: unknown) {
      console.error(error)
      toast.error("เกิดข้อผิดพลาดในการอัปโหลด: " + errMsg(error))
    } finally {
      setUploading((u) => ({ ...u, [field]: false }))
    }
  }

  const remove = async (field: DocField, doc: DocItem, confirmOptions: { title: string; message: string }, successText: string) => {
    const confirmed = await confirm({ ...confirmOptions, danger: true, confirmText: "ลบเอกสาร", cancelText: "ยกเลิก" })
    if (!confirmed) return
    try {
      const updated = docsByField[field].filter((d) => d.path !== doc.path || d.name !== doc.name)
      await onSave({ [field]: updated as unknown as Json })
      toast.success(successText)
    } catch (error: unknown) {
      console.error(error)
      toast.error("เกิดข้อผิดพลาดในการลบ: " + errMsg(error))
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-4">
        <DocsCard
          title="เอกสารประกอบการเรียน (สำหรับนักศึกษา)"
          description="เอกสารสำหรับให้นักศึกษาเปิดดูหรือดาวน์โหลด (รองรับ PDF, Word, PowerPoint, รูปภาพ, ข้อความ)"
          uploadLabel="อัปโหลดเอกสาร"
          uploadAriaLabel="อัปโหลดเอกสารประกอบการเรียน"
          uploading={uploading.documents}
          docs={docsByField.documents}
          emptyIcon={<FolderIcon />}
          emptyText="ยังไม่มีเอกสารประกอบการเรียนสำหรับบทเรียนนี้"
          onUpload={(file) => upload("documents", file, "อัปโหลดเอกสารสำเร็จ")}
          onDelete={(doc) => remove("documents", doc, { title: "ลบเอกสารประกอบการเรียน", message: `คุณต้องการลบเอกสาร "${doc.name}" ใช่หรือไม่?` }, "ลบเอกสารสำเร็จ")}
        />
        <DocsCard
          title={
            <>
              <SparklesIcon className="size-4 text-primary" />
              เอกสารประกอบความรู้สำหรับ AI (นักศึกษาจะไม่เห็น)
            </>
          }
          description="เอกสารเสริมข้อมูลเพื่อให้ AI ติวเตอร์ใช้ศึกษาและตอบคำถามได้อย่างเจาะลึกเฉพาะทาง"
          uploadLabel="อัปโหลดเอกสาร AI"
          uploadAriaLabel="อัปโหลดเอกสารสำหรับ AI"
          uploading={uploading.ai_documents}
          docs={docsByField.ai_documents}
          emptyIcon={<SparklesIcon />}
          emptyText="ยังไม่มีเอกสารเสริมสำหรับ AI ในบทเรียนนี้ (AI จะใช้ข้อมูลบทเรียนปกติเป็นหลัก)"
          onUpload={(file) => upload("ai_documents", file, "อัปโหลดเอกสารสำหรับ AI สำเร็จ")}
          onDelete={(doc) =>
            remove("ai_documents", doc, { title: "ลบเอกสารสำหรับ AI", message: `คุณต้องการลบเอกสารสำหรับ AI "${doc.name}" ใช่หรือไม่? (เอกสารนี้จะถูกถอนออกจากระบบความรู้ของ AI)` }, "ลบเอกสารสำหรับ AI สำเร็จ")
          }
        />
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">การตั้งค่าเอกสาร</CardTitle>
          </CardHeader>
          <CardContent>
            <SwitchRow label="อนุญาตให้นักศึกษาดาวน์โหลดเอกสาร" on={lesson.allow_download ?? true} onChange={(val) => onSave({ allow_download: val })} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">คำแนะนำ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <p>
              • <strong className="text-foreground">เอกสารทั่วไป</strong> จะถูกแสดงให้นักศึกษาเห็นและศึกษาในบทเรียนในแถบ &quot;เอกสารประกอบ&quot;
            </p>
            <p>
              • <strong className="text-foreground">เอกสารสำหรับ AI</strong> จะถูกป้อนให้กับโมเดล AI โดยตรงเป็นคลังความรู้เบื้องหลังเพื่อใช้อ้างอิงขณะติว โดยนักศึกษาทั่วไปจะไม่เห็นรายชื่อไฟล์และไม่สามารถเข้าถึงไฟล์เหล่านี้ได้เด็ดขาด
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
