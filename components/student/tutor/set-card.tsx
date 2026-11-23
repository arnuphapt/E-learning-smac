import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CourseCodeBadge } from "@/components/student/course/course-code-badge"
import { heroColor, tint } from "@/components/student/course/types"
import type { TutorSetSummary } from "./types"

/** One tutor set tile; the whole card is the link. */
export function SetCard({ set: c }: { set: TutorSetSummary }) {
  const hero = heroColor(c.hero)
  return (
    <Card className="relative py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl border"
              style={{ background: tint(hero, 14), borderColor: tint(hero, 30), color: hero }}
            >
              <SparklesIcon className="size-5" />
            </div>
            <CourseCodeBadge hero={c.hero}>{c.code}</CourseCodeBadge>
          </div>
          <Badge variant="outline" className="text-muted-foreground">ชุดติว</Badge>
        </div>
        <h2 className="leading-snug font-bold">{c.title}</h2>
        <p className="min-h-9 flex-1 text-sm text-muted-foreground">{c.subtitle}</p>
        <div className="flex items-center justify-between border-t pt-3">
          <Badge variant="secondary">
            <BookOpenIcon />
            {c.lessons} บท
          </Badge>
          <Button asChild variant="secondary" size="sm">
            <Link href={"/s/tutor/" + c.id} aria-label={`เปิดชุดติว: ${c.title}`} className="after:absolute after:inset-0 after:content-['']">
              เปิดชุดติว
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
