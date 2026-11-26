import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { MappedCourse } from "@/components/student/course/types"
import { cn } from "@/lib/utils"

export interface NextDueItem {
  title: string
  dueLabel: string
  daysLeft: number
  to: string
}

function firstNameOf(name?: string | null): string {
  const trimmed = (name || "").trim()
  if (!trimmed) return ""
  return trimmed.split(/\s+/)[0] || ""
}

/** Student home summary band: Thai greeting, overall course progress, and optional next due item. */
export function StudentHomeSummary({
  userName,
  courses,
  nextDue,
}: {
  userName?: string | null
  courses: MappedCourse[]
  nextDue?: NextDueItem | null
}) {
  const firstName = firstNameOf(userName)
  const total = courses.length
  const completed = courses.filter((c) => c.progress >= 100).length
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100).length
  const avgProgress = total > 0 ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / total) : 0

  const cols = nextDue ? "md:grid-cols-3" : total > 0 ? "md:grid-cols-2" : "md:grid-cols-1"

  return (
    <Card className="mb-6 py-0">
      <CardContent className={cn("grid grid-cols-1 gap-5 p-5", cols)}>
        <div className="min-w-0">
          <h2 className="font-serif text-2xl leading-snug font-semibold tracking-tight text-foreground">
            {firstName ? `สวัสดี, ${firstName}` : "สวัสดี"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? `คุณมี ${total} รายวิชาที่ลงทะเบียนในภาคเรียนนี้` : "พื้นที่เรียนรู้ดิจิทัลทางการพยาบาล"}
          </p>
        </div>

        {total > 0 && (
          <div className="min-w-0 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">ความคืบหน้าโดยรวม</span>
              <span className="text-xl font-bold tabular-nums text-foreground">{avgProgress}%</span>
            </div>
            <Progress value={avgProgress} className="mt-2 h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              เรียนจบ {completed} จาก {total} รายวิชา
              {inProgress > 0 ? ` · กำลังเรียน ${inProgress} วิชา` : ""}
            </p>
          </div>
        )}

        {nextDue && (
          <div className="min-w-0 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">กำหนดส่งถัดไป</span>
              {nextDue.daysLeft < 0 ? (
                <Badge variant="outline" className="border-transparent bg-destructive/10 text-destructive">
                  เลยกำหนด
                </Badge>
              ) : nextDue.daysLeft <= 3 ? (
                <Badge variant="outline" className="border-transparent bg-amber-accent-soft text-amber-accent-strong">
                  {nextDue.daysLeft === 0 ? "วันนี้" : `อีก ${nextDue.daysLeft} วัน`}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{nextDue.dueLabel}</span>
              )}
            </div>
            <Link
              href={nextDue.to}
              className="mt-1.5 flex items-center justify-between gap-2 text-sm font-semibold text-foreground hover:text-primary"
            >
              <span className="truncate">{nextDue.title}</span>
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{nextDue.dueLabel}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
