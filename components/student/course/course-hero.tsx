import { BookOpenIcon, UserIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Database } from "@/lib/database.types"
import { CourseCodeBadge } from "./course-code-badge"

type CourseRow = Database["public"]["Views"]["courses"]["Row"]

/** Course header card: code, title, instructor, lesson count and the overall progress panel. */
export function CourseHero({ course, lessonCount, completed, progress }: { course: CourseRow; lessonCount: number; completed: number; progress: number }) {
  return (
    <Card className="mb-5">
      <CardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-72 flex-1">
          <div className="mb-2.5 flex items-center gap-2.5">
            <CourseCodeBadge>{course.code}</CourseCodeBadge>
            <span className="text-xs text-muted-foreground">{course.term}</span>
          </div>
          <h1 className="mb-1.5 text-2xl leading-snug font-bold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground">{course.subtitle}</p>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserIcon className="size-4" />
              {course.instructor}
            </span>
            <span className="flex items-center gap-1">
              <BookOpenIcon className="size-4" />
              {lessonCount} บทเรียน
            </span>
          </div>
        </div>
        <div className="min-w-52 rounded-xl bg-muted p-4">
          <div className="mb-1 text-xs text-muted-foreground">ความคืบหน้ารวม</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl leading-none font-bold tabular-nums">{progress}</span>
            <span className="mb-1 text-muted-foreground">%</span>
          </div>
          <Progress className="mt-2" value={progress} />
          <div className="mt-2 text-xs text-muted-foreground">
            เรียนจบ {completed} จาก {lessonCount} บทเรียน
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
