"use client"

import { ClockIcon, FileIcon, InfoIcon, SendIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { FilePickButton } from "@/components/lesson/file-pick-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getFileName, getFileTypeAndSize } from "./files"
import type { useAssignmentDetail } from "./use-assignment-detail"

const roleLabel = (role: string | null) => (role === "course_manager" ? "ผู้รับผิดชอบ" : role === "admin" ? "ผู้ดูแลระบบ" : "อาจารย์ผู้สอน")

/** "ส่งงานของคุณ": file / text / grader pickers and the save-draft / submit buttons; shows the sent state with a cancel. */
export function SubmitCard({ d }: { d: ReturnType<typeof useAssignmentDetail> }) {
  const { a, status, submission, instructors, file, text, graderId, uploading } = d
  if (!a) return null
  const submitted = status === "submitted"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UploadIcon className="size-4 text-primary" />
          ส่งงานของคุณ
        </CardTitle>
        {submitted && <CardDescription>ส่งแล้ว · รอการตรวจจากอาจารย์</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4">
        {submitted && (
          <div className="flex items-center gap-3 rounded-lg bg-info-soft p-3.5">
            <ClockIcon className="size-[18px] text-info" />
            <div className="flex-1 text-sm">
              <b className="text-info">ส่งงานเรียบร้อยแล้ว</b>
              <div className="text-muted-foreground">ส่งเมื่อ {submission?.submitted_at || "—"} — อาจารย์จะแจ้งผลเมื่อตรวจเสร็จ</div>
              {submission?.grader_id && (
                <div className="mt-1">
                  <span className="text-muted-foreground">ส่งถึงผู้ตรวจ: </span>
                  <strong>{instructors.find((ins) => ins.id === submission.grader_id)?.name || "อาจารย์ผู้ตรวจ"}</strong>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={d.cancelSubmit}>
              ยกเลิกการส่ง
            </Button>
          </div>
        )}

        {a.allow_file && (!submitted || file) && (
          <div className="grid gap-2">
            <span className="text-sm font-medium">แนบไฟล์ {submitted && "(ส่งแล้ว)"}</span>
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <FileIcon className="size-[17px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{getFileName(file)}</div>
                  <div className="text-xs text-muted-foreground">{getFileTypeAndSize(file)}</div>
                </div>
                {!submitted && !uploading && (
                  <Button variant="ghost" size="icon" aria-label="ลบไฟล์" className="text-destructive" onClick={() => d.setFile(null)}>
                    <Trash2Icon />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <UploadIcon className="size-5" />
                </div>
                <div className="text-sm font-semibold">{uploading ? "กำลังอัปโหลดไฟล์..." : "เลือกไฟล์เพื่อแนบกับใบงาน"}</div>
                <div className="text-xs text-muted-foreground">รองรับ PDF, DOCX, รูปภาพ — ไม่เกิน 25 MB</div>
                <FilePickButton label="เลือกไฟล์" variant="outline" disabled={uploading} icon={<UploadIcon />} onFile={d.upload}>
                  เลือกไฟล์
                </FilePickButton>
              </div>
            )}
          </div>
        )}

        {a.allow_text && (
          <FormField label={<>คำตอบ / หมายเหตุถึงอาจารย์ <span className="font-normal text-muted-foreground">(ถ้ามี)</span></>} htmlFor="asg-text">
            <Textarea
              id="asg-text"
              rows={4}
              placeholder="พิมพ์คำตอบหรือคำอธิบายเพิ่มเติม…"
              value={text}
              onChange={(e) => d.setText(e.target.value)}
              disabled={submitted}
            />
          </FormField>
        )}

        {!submitted && instructors.length > 0 && (
          <FormField label="ส่งงานให้ผู้ตรวจ" htmlFor="asg-grader" required>
            <Select value={graderId} onValueChange={d.setGraderId}>
              <SelectTrigger id="asg-grader" className="w-full">
                <SelectValue placeholder="— เลือกอาจารย์ผู้ตรวจ —" />
              </SelectTrigger>
              <SelectContent>
                {instructors.map((ins) => (
                  <SelectItem key={ins.id} value={ins.id ?? ""}>
                    {ins.name} ({roleLabel(ins.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        {!submitted && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <InfoIcon className="size-3.5" />
              ส่งได้ก่อน {a.due} {a.due_time}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={d.saveDraft}>
                บันทึกฉบับร่าง
              </Button>
              <Button disabled={!d.canSubmit || uploading} onClick={d.submit}>
                <SendIcon />
                ส่งใบงาน
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
