import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { ToneBadge } from "@/components/common/status-badge"
import type { BankCourseRow, BankLessonRow, BankQuestionRow } from "./bank-data"

/** One row of the standalone bank list: links to the question in its lesson's bank page. */
export function BankListItem({ r, lesson, set }: { r: BankQuestionRow; lesson?: BankLessonRow; set?: BankCourseRow }) {
  return (
    <Link href={`/i/lesson/${r.lessonId}/bank#q-${r.id}`} className="flex gap-3.5 border-b px-4 py-4 text-inherit no-underline transition-colors last:border-b-0 hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ToneBadge tone="muted">{set?.code}</ToneBadge>
          <span className="text-xs text-muted-foreground">
            บทที่ {lesson?.index} {lesson?.title}
          </span>
          {r.topic ? <ToneBadge tone="primary">{r.topic}</ToneBadge> : <ToneBadge tone="muted">ไม่มีหัวข้อ</ToneBadge>}
        </div>
        <div className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere]">{r.text}</div>
        {r.answerText && <div className="mt-2 truncate text-xs text-success">เฉลย: {r.answerText}</div>}
      </div>
      <ArrowRightIcon className="size-4 shrink-0 self-center text-muted-foreground" />
    </Link>
  )
}
