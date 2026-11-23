import { MenuIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { RateLimitInfo, StudentLessonRow } from "./types"

/** Model badge, current lesson, summarize button and the 5-hour quota. */
export function AiTopBar({
  lesson,
  onOpenMenu,
  onSummarize,
  summarizeDisabled,
  summarizing,
  rateLimitInfo,
}: {
  lesson?: StudentLessonRow
  onOpenMenu: () => void
  onSummarize: () => void
  summarizeDisabled: boolean
  summarizing: boolean
  rateLimitInfo: RateLimitInfo | null
}) {
  const full = rateLimitInfo ? rateLimitInfo.used >= rateLimitInfo.limit : false
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 lg:hidden" onClick={onOpenMenu} aria-label="เปิดเมนูข้าง">
          <MenuIcon />
        </Button>
        <Badge variant="secondary" className="shrink-0 gap-1.5 rounded-full px-3 py-1 text-[13px]">
          <SparklesIcon className="text-primary" />
          Gemini 3.8 Flash
        </Badge>
        {lesson && (
          <div className="hidden min-w-0 truncate text-[13px] text-muted-foreground md:block">
            · บทที่ {lesson.index}: <span className="font-medium text-foreground">{lesson.title}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {lesson && lesson.allow_ai !== false && (
          <Button type="button" variant="outline" size="sm" className="rounded-full font-semibold" onClick={onSummarize} disabled={summarizeDisabled}>
            <SparklesIcon className="text-primary" />
            {summarizing ? "กำลังสรุป..." : "สรุปบทเรียนนี้"}
          </Button>
        )}
        {rateLimitInfo && (
          <Badge
            variant={full ? "destructive" : "outline"}
            className="hidden rounded-full px-2.5 py-1 text-xs md:inline-flex"
            title="โควต้าการถามคำถามในรอบเวลา 5 ชั่วโมง"
          >
            โควต้า: {rateLimitInfo.used}/{rateLimitInfo.limit}
          </Badge>
        )}
      </div>
    </div>
  )
}
