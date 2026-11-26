"use client"

import Link from "next/link"
import { ClipboardListIcon, PencilIcon, PlusIcon, Trash2Icon, VideoIcon } from "lucide-react"
import { bankWarning } from "@/lib/tutor-bank"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { BankStats, WorkspaceLesson } from "./workspace-data"

/** Lessons of one tutor set as a clean clickable list (no drag-and-drop or manual reordering). */
export function TutorLessonList({
  lessons,
  bank,
  onCreate,
  onEdit,
  onDelete,
}: {
  lessons: WorkspaceLesson[]
  bank: Record<string, BankStats>
  onCreate: () => void
  onEdit: (lesson: WorkspaceLesson) => void
  onDelete: (lesson: WorkspaceLesson) => void
}) {
  return (
    <div className="grid gap-3">
      {lessons.map((l, index) => {
        const b = bank[l.id] || { count: 0, topics: 0 }
        const warn = bankWarning(b.count, l.tutor_draw_count)
        const published = l.status === "active"
        return (
          <Card
            key={l.id}
            onClick={() => onEdit(l)}
            className="cursor-pointer flex-row flex-wrap items-center gap-3 px-4 py-3.5 transition hover:border-primary/40 sm:flex-nowrap"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted font-bold tabular-nums text-primary">
              {String(l.index ?? index + 1).padStart(2, "0")}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold">{l.title || "(ไม่มีชื่อหมวดติว)"}</span>
                <ToneBadge tone={published ? "success" : "muted"}>{published ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</ToneBadge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1">
                  <VideoIcon className="size-3.5" />
                  {l.video || l.video_url ? "มีวิดีโอ" : "ไม่มีวิดีโอ"}
                </span>
                <span className="flex items-center gap-1">
                  <ClipboardListIcon className="size-3.5" />
                  คลัง {b.count} ข้อ · {b.topics} หัวข้อ
                </span>
                <span>{l.tutor_draw_count != null ? `สุ่ม ${l.tutor_draw_count} ข้อ/รอบ` : "ใช้ทั้งคลัง"}</span>
              </div>
            </div>

            {warn && <ToneBadge tone="warning">คลังไม่พอ</ToneBadge>}

            <div className="flex shrink-0 flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/i/lesson/${l.id}/bank`}>
                  <ClipboardListIcon />
                  คลังข้อสอบ
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(l)}>
                <PencilIcon />
                จัดการ
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                aria-label={`ลบหมวดติว ${l.title || ""}`}
                onClick={() => onDelete(l)}
              >
                <Trash2Icon />
              </Button>
            </div>
          </Card>
        )
      })}
      <Button variant="outline" className="h-auto border-dashed py-4 text-muted-foreground" onClick={onCreate}>
        <PlusIcon />
        เพิ่มหมวดติวใหม่
      </Button>
    </div>
  )
}
