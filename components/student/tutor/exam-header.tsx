import { CheckIcon, ClockIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTime, type TutorLessonInfo } from "./exam-types"

/** Sticky bar of a running round: lesson title, countdown (red in the last minute) and the submit button. */
export function ExamHeader({
  info,
  remaining,
  timeUp,
  submitting,
  onSubmit,
}: {
  info: TutorLessonInfo
  remaining: number
  timeUp: boolean
  submitting: boolean
  onSubmit: () => void
}) {
  const { set, lesson } = info
  const urgent = timeUp || remaining <= 60
  return (
    <div className="sticky top-2 z-10 mb-4 flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{set.code} · ทำข้อสอบ</div>
        <div className="truncate text-sm font-bold">บทที่ {lesson.index} · {lesson.title}</div>
      </div>
      <Badge
        variant={urgent ? "destructive" : "secondary"}
        className={cn("h-8 gap-1.5 px-3.5 text-sm tabular-nums")}
        role="timer"
        aria-label="เวลาที่เหลือ"
      >
        <ClockIcon />
        {formatTime(remaining)}
      </Badge>
      <Button size="sm" disabled={submitting || timeUp} onClick={onSubmit}>
        <CheckIcon />
        {submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
      </Button>
    </div>
  )
}
