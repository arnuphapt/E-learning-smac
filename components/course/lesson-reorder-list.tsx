"use client"

import { useRef, useState } from "react"
import { ClipboardListIcon, FileTextIcon, GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon, VideoIcon } from "lucide-react"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CourseAssignmentRef, LessonRow, SubmissionRow } from "./detail"

/** Lessons of one course as drag-to-reorder cards (a sortable list, so not a DataTable). */
export function LessonReorderList({
  lessons,
  assignments,
  submissions,
  onReorder,
  onCreate,
  onEdit,
  onDelete,
}: {
  lessons: LessonRow[]
  assignments: CourseAssignmentRef[]
  submissions: SubmissionRow[]
  /** Called with the new order after a drop. */
  onReorder: (reordered: LessonRow[]) => void
  onCreate: () => void
  onEdit: (lesson: LessonRow) => void
  onDelete: (lesson: LessonRow) => void
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const justDraggedRef = useRef(false)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return
    justDraggedRef.current = true
    const reordered = [...lessons]
    const [dragged] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, dragged)
    setDraggedIndex(null)
    onReorder(reordered.map((item, idx) => ({ ...item, index: idx + 1 })))
  }

  return (
    <div className="grid gap-3">
      {lessons.map((l, index) => {
        const lessonAsgIds = assignments.filter((a) => a.lesson_id === l.id).map((a) => a.id)
        const pendingCount = submissions.filter((sub) => Boolean(sub.assignment_id && lessonAsgIds.includes(sub.assignment_id)) && sub.status === "submitted").length
        return (
          <Card
            key={l.id}
            draggable
            onDragStart={(e) => {
              setDraggedIndex(index)
              e.dataTransfer.effectAllowed = "move"
              e.dataTransfer.setData("text/plain", String(index))
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={() => {
              setDraggedIndex(null)
              setTimeout(() => {
                justDraggedRef.current = false
              }, 0)
            }}
            onClick={() => {
              if (justDraggedRef.current) {
                justDraggedRef.current = false
                return
              }
              onEdit(l)
            }}
            className={cn("cursor-grab flex-row items-center gap-3 px-4 py-3.5 transition", draggedIndex === index && "border-2 border-dashed border-primary opacity-40")}
          >
            <GripVerticalIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted font-bold text-primary">{String(l.index).padStart(2, "0")}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{l.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <VideoIcon className="size-3.5" />
                  {l.video || l.video_url ? "มีวิดีโอ" : "ไม่มีวิดีโอ"}
                </span>
                <span className="flex items-center gap-1">
                  <ClipboardListIcon className="size-3.5" />
                  Pre/Post-test
                </span>
                <span className="flex items-center gap-1">
                  <FileTextIcon className="size-3.5" />
                  {lessonAsgIds.length > 0 ? `${lessonAsgIds.length} ใบงาน` : "ไม่มีใบงาน"}
                </span>
              </div>
            </div>
            {pendingCount > 0 && <ToneBadge tone="warning">{pendingCount} รอตรวจ</ToneBadge>}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(l)
                }}
              >
                <PencilIcon />
                จัดการ
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                aria-label={`ลบบทเรียน ${l.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(l)
                }}
              >
                <Trash2Icon />
              </Button>
            </div>
          </Card>
        )
      })}
      <Button variant="outline" className="h-auto border-dashed py-4 text-muted-foreground" onClick={onCreate}>
        <PlusIcon />
        เพิ่มบทเรียนใหม่
      </Button>
    </div>
  )
}
