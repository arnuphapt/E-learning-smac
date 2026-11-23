import Link from "next/link"
import { ChevronRightIcon, LockIcon, PlayIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { LessonRow } from "./types"

/** Link to the next lesson of the course (nothing on the last one). */
export function NextLessonCard({ lesson, allLessons }: { lesson: LessonRow; allLessons: LessonRow[] }) {
  const next = allLessons[allLessons.findIndex((l) => l.id === lesson.id) + 1]
  if (!next) return null
  const Icon = next.status === "locked-pretest" ? LockIcon : PlayIcon
  return (
    <Card className="relative py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 px-5 py-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">บทเรียนถัดไป</div>
          <Link href={"/s/lesson/" + next.id} className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-['']">
            บทที่ {next.index} · {next.title}
          </Link>
        </div>
        <ChevronRightIcon className="size-[18px] text-muted-foreground" aria-hidden />
      </CardContent>
    </Card>
  )
}
