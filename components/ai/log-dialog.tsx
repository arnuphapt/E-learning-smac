"use client"

import { SparklesIcon } from "lucide-react"
import { MarkdownView } from "@/components/common/markdown-view"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { EnrichedAiLog } from "./log-types"

/** One student question and the AI reply, with who / where / when above. */
export function AiLogDialog({
  log,
  studentEmail,
  onClose,
}: {
  log: EnrichedAiLog
  studentEmail: string | null
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>รายละเอียดการใช้งาน AI</DialogTitle>
          <DialogDescription>ประวัติคำถามและการตอบกลับของระบบ AI ผู้ช่วยสอน</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border bg-muted p-3 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground">นักศึกษา</div>
            <div className="text-sm font-semibold">
              {log.studentName} ({log.studentNo})
            </div>
            <div className="text-xs text-muted-foreground">{studentEmail}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">รายวิชา & บทเรียน</div>
            <div className="text-sm font-semibold">
              {log.courseCode} - {log.courseTitle}
            </div>
            <div className="text-xs text-muted-foreground">
              บทที่ {log.lessonIndex}: {log.lessonTitle}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">รูปแบบ & วันที่</div>
            <div className="text-sm font-semibold">{log.mode === "summarize" ? "สรุปเนื้อหา" : "ถามตอบ"}</div>
            <div className="text-xs text-muted-foreground">{new Date(log.created_at ?? 0).toLocaleString("th-TH")}</div>
          </div>
        </div>

        <div className="grid max-h-96 gap-3 overflow-y-auto pr-1">
          <div className="flex items-start justify-end gap-2">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground">
              <div className="mb-1 text-xs font-bold opacity-90">คำถามจากนักศึกษา:</div>
              <div className="whitespace-pre-line leading-relaxed">{log.message}</div>
            </div>
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{(log.studentName || "?").charAt(0)}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-start gap-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <SparklesIcon className="size-4" />
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm border bg-muted px-4 py-3">
              <div className="mb-2 text-xs font-bold text-primary">AI ตอบกลับ:</div>
              <MarkdownView text={log.reply ?? ""} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
