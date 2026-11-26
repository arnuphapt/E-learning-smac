import Link from "next/link"
import type { ReactNode } from "react"
import { BookOpenIcon, CheckCircle2Icon, ChevronRightIcon, ClipboardListIcon, FileTextIcon, LockIcon, VideoIcon } from "lucide-react"
import { StatusBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { asTestObj, type CourseLessonItem, type LessonTestStatus } from "./use-course-detail"

type ChipTone = "success" | "warning" | "muted"
type Chip = { text: string; tone: ChipTone; icon: ReactNode }

const toneClass: Record<ChipTone, string> = {
  success: "border-transparent bg-success-soft text-success",
  warning: "border-transparent bg-warning-soft text-warning",
  muted: "border-transparent bg-muted text-muted-foreground",
}

const scoreText = (t: LessonTestStatus) => (t.score !== null && t.score !== undefined ? ` (${t.score}/${t.total} คะแนน)` : " (ทำแล้ว)")

function lessonChips(l: CourseLessonItem): Chip[] {
  const chips: Chip[] = []
  const pretest = asTestObj(l.pretest)
  const posttest = asTestObj(l.posttest)
  const done = <CheckCircle2Icon />
  const clip = <ClipboardListIcon />

  if (pretest) {
    if (pretest.taken) chips.push({ text: `Pre-test${scoreText(pretest)}`, tone: "success", icon: done })
    else if (pretest.required) chips.push({ text: "Pre-test (ต้องทำ)", tone: "warning", icon: clip })
    else chips.push({ text: "Pre-test (ไม่บังคับ)", tone: "muted", icon: clip })
  }
  if (posttest?.required) {
    if (posttest.taken) chips.push({ text: `Post-test${scoreText(posttest)}`, tone: "success", icon: done })
    else chips.push({ text: "Post-test (ยังไม่ได้ทำ)", tone: "muted", icon: clip })
  }
  if (l.assignments && l.assignments.length > 0) {
    const completed = l.assignments.filter((a) => a.status === "graded" || a.status === "submitted").length
    const allGraded = l.assignments.every((a) => a.status === "graded")
    chips.push({
      text: `ใบงาน (ส่งแล้ว ${completed}/${l.assignments.length})`,
      tone: allGraded ? "success" : "muted",
      icon: <FileTextIcon />,
    })
  }
  return chips
}

/** One lesson of a course: number (or lock), title, status chips and progress; the whole row opens the lesson. */
export function LessonRow({ lesson: l, hero: _hero }: { lesson: CourseLessonItem; hero?: string | null }) {
  void _hero
  const locked = l.status === "locked-pretest"
  const hasVideo = !!(l.video_url || l.video)

  return (
    <Card className="relative py-0 transition-colors hover:border-primary/40">
      <CardContent className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
            {locked ? <LockIcon className="size-5" /> : <span className="font-bold tabular-nums">{String(l.index).padStart(2, "0")}</span>}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Link href={"/s/lesson/" + l.id} className="font-bold after:absolute after:inset-0 after:content-['']">
                {l.title}
              </Link>
              <StatusBadge status={l.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={toneClass.muted}>
                {hasVideo ? <VideoIcon /> : <BookOpenIcon />}
                {hasVideo ? `มีวิดีโอ (${l.duration || "ไม่ระบุ"})` : "ไม่มีวิดีโอ"}
              </Badge>
              {lessonChips(l).map((c, i) => (
                <Badge key={i} variant="outline" className={toneClass[c.tone]}>
                  {c.icon}
                  {c.text}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden w-32 md:block">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ความคืบหน้า</span>
            <span className="font-semibold tabular-nums">{l.progress || 0}%</span>
          </div>
          <Progress value={l.progress || 0} />
        </div>
        <ChevronRightIcon className="size-[18px] text-muted-foreground" aria-hidden />
      </CardContent>
    </Card>
  )
}
