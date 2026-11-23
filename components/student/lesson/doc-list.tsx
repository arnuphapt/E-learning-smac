import { DownloadIcon, FileTextIcon, FolderIcon, LockIcon } from "lucide-react"
import { EmptyState } from "@/components/common/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fileHref } from "@/lib/files"
import { parseDocs, type LessonRow } from "./types"

/** Lesson documents with a download button per file (or a "not allowed" tag). `title` adds a card header. */
export function DocList({ lesson, title }: { lesson: LessonRow; title?: string }) {
  const docs = parseDocs(lesson.documents)
  const allowDownload = lesson.allow_download ?? true

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={<FolderIcon />} title="ไม่มีเอกสารประกอบการเรียนสำหรับบทเรียนนี้" />
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="gap-0 py-0">
      {title && (
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle className="flex items-center gap-2">
            <FolderIcon className="size-[18px] text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="divide-y px-0">
        {docs.map((doc, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <FileTextIcon className="size-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{doc.name}</div>
              <div className="text-xs text-muted-foreground">{doc.size}</div>
            </div>
            {allowDownload ? (
              <Button asChild variant="outline" size="sm">
                <a href={fileHref(doc.url)} download={doc.name} target="_blank" rel="noopener noreferrer">
                  <DownloadIcon />
                  ดาวน์โหลด
                </a>
              </Button>
            ) : (
              <Badge variant="secondary">
                <LockIcon />
                ไม่อนุญาตให้ดาวน์โหลด
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
