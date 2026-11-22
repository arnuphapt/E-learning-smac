import { DownloadIcon, FileIcon, MessageSquareIcon } from "lucide-react"
import { fileHref } from "@/lib/files"
import { EmptyState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { SubmissionRow } from "./scores"

const IMAGE = /\.(jpe?g|png|webp|gif)$/i

/** The student's file (download + PDF/image preview) and typed answer. */
export function SubmissionViewer({ sub }: { sub: SubmissionRow }) {
  const file = sub.file
  return (
    <div className="grid gap-3">
      {file && (
        <>
          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <FileIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{file.startsWith("http") || file.includes("/") ? file.split("/").pop()?.replace(/^\d+_/, "") : file}</div>
                <div className="text-xs text-muted-foreground">ส่งเมื่อ {sub.submitted_at}</div>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={fileHref(file)} download={file.split("/").pop() || undefined} target="_blank" rel="noopener noreferrer">
                  <DownloadIcon />
                  ดาวน์โหลด
                </a>
              </Button>
            </CardContent>
          </Card>
          {file.toLowerCase().endsWith(".pdf") ? (
            <div className="h-[450px] w-full overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[680px]">
              <iframe src={`${fileHref(file)}#toolbar=1`} className="size-full border-0" title="PDF Preview" />
            </div>
          ) : IMAGE.test(file) ? (
            <div className="flex w-full justify-center overflow-hidden rounded-xl border bg-card p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- storage URL, size unknown */}
              <img src={fileHref(file)} alt="Student submission preview" className="max-h-[450px] max-w-full rounded-lg object-contain lg:max-h-[680px]" />
            </div>
          ) : (
            <EmptyState className="min-h-80 border" icon={<FileIcon />} title="ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้" />
          )}
        </>
      )}

      {sub.text && (
        <Card>
          <CardContent>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <MessageSquareIcon className="size-4 text-primary" />
              คำตอบของนักศึกษา (แบบข้อความ)
            </div>
            <div className="whitespace-pre-line rounded-lg bg-muted p-3.5 text-sm leading-relaxed">{sub.text}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
