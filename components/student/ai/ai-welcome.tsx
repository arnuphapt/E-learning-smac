import { BookOpenIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PROMPT_CARDS } from "./chat-utils"
import type { StudentLessonRow } from "./types"

/** Hero shown before the first question: greeting, the lesson, and four starter prompts. */
export function AiWelcome({
  studentName,
  lesson,
  disabled,
  onPrompt,
}: {
  studentName: string
  lesson: StudentLessonRow
  disabled: boolean
  onPrompt: (prompt: string) => void
}) {
  return (
    <div className="flex w-full flex-col">
      <h2 className="mb-2 text-[clamp(28px,4.5vw,42px)] leading-tight font-semibold tracking-tight">สวัสดีค่ะ, คุณ{studentName}</h2>
      <p className="mb-6 text-[clamp(18px,2.5vw,24px)] font-medium text-muted-foreground">มีอะไรให้ยูริช่วยในบทเรียนนี้ไหมคะ?</p>

      <div className="mb-7 rounded-2xl border bg-muted/50 px-[18px] py-3.5 text-[13px] leading-relaxed">
        <div className="mb-1 flex items-center gap-1.5 font-bold text-primary">
          <BookOpenIcon className="size-3.5" />
          บทที่ {lesson.index}: {lesson.title}
        </div>
        <div className="text-muted-foreground">{lesson.description || "คุณสามารถสอบถามเนื้อหา อธิบายข้อสงสัย หรือขอแบบฝึกหัดได้ทันที"}</div>
      </div>

      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3">
        {PROMPT_CARDS.map((card) => (
          <Button
            key={card.title}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onPrompt(card.prompt)}
            className="h-auto flex-col items-stretch justify-between gap-3 rounded-2xl px-[18px] py-4 text-left whitespace-normal"
          >
            <span className="text-[13.5px] leading-snug font-semibold">{card.title}</span>
            <span className="flex w-full items-center justify-between gap-2 text-xs font-normal text-muted-foreground">
              <span>{card.desc}</span>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-primary">
                <SparklesIcon className="size-3.5" />
              </span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
