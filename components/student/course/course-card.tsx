import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon, UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { startLabel, type MappedCourse } from "./types"

/** Course tile for the grid / list views of the student course list; the whole card is the link. */
export function CourseCard({ course: c, layout = "grid" }: { course: MappedCourse; layout?: "grid" | "list" }) {
  const list = layout === "list"
  return (
    <Card className="relative py-0 transition-colors hover:border-primary/40">
      <CardContent className={cn("flex gap-4 p-5", list ? "flex-col items-start sm:flex-row sm:items-center" : "flex-1 flex-col")}>
        {!list && (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
            <span className="text-xs text-muted-foreground">{c.term}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={"/s/course/" + c.id} className="font-semibold after:absolute after:inset-0 after:content-['']">
              {c.title}
            </Link>
            {list && <span className="font-mono text-xs text-muted-foreground">{c.code}</span>}
          </div>
          <p className={cn("mt-1 text-sm text-muted-foreground", list ? "truncate" : "min-h-9")}>{c.subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserIcon className="size-3.5" aria-hidden />
              {c.instructor}
            </span>
            <span className="flex items-center gap-1">
              <BookOpenIcon className="size-3.5" aria-hidden />
              {c.lessons} บทเรียน
            </span>
            {list && <span>{c.term}</span>}
          </div>
        </div>

        <div className={cn("grid gap-1", list ? "w-full sm:w-36" : "w-full")}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ความคืบหน้า</span>
            <span className="font-semibold tabular-nums">{c.progress}%</span>
          </div>
          <Progress value={c.progress} />
        </div>

        <Button asChild size="sm" className={cn(!list && "self-end")} tabIndex={-1}>
          <span>
            {startLabel(c.progress)}
            <ArrowRightIcon />
          </span>
        </Button>
      </CardContent>
    </Card>
  )
}
