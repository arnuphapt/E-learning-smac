import Link from "next/link"
import { BookOpenIcon, ChevronRightIcon, VideoIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { TutorLessonItem } from "./types"

/** One lesson of a tutor set; the whole row opens the lesson. */
export function TutorLessonRow({ lesson: l }: { lesson: TutorLessonItem }) {
  return (
    <Card className="relative py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 px-5 py-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-primary tabular-nums">
          {String(l.index ?? "").padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={"/s/tutor/lesson/" + l.id} className="block truncate font-semibold after:absolute after:inset-0 after:content-['']">
            {l.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {l.hasVideo ? <VideoIcon className="size-3.5 text-primary" /> : <BookOpenIcon className="size-3.5" />}
              {l.hasVideo ? `มีวิดีโอ (${l.duration || "ไม่ระบุ"})` : "ไม่มีวิดีโอ"}
            </span>
            {l.tutor_max_attempts === 1 && <Badge variant="outline">ทำได้ครั้งเดียว</Badge>}
          </div>
        </div>
        <ChevronRightIcon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
      </CardContent>
    </Card>
  )
}
