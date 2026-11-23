import Link from "next/link"
import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { SubmitResult, TutorLessonInfo } from "./exam-types"

/** Submitted: score + total here, the full result (analysis, review) is on the result page. */
export function ExamSubmitted({ info, result, attemptId }: { info: TutorLessonInfo; result: SubmitResult; attemptId: string }) {
  const { set, lesson } = info
  const base = "/s/tutor/lesson/" + lesson.id
  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardContent className="py-4">
        <p className="mb-1 text-sm text-muted-foreground">{result.status === "expired" ? "หมดเวลา ระบบส่งคำตอบให้แล้ว" : "ส่งคำตอบแล้ว"}</p>
        <p className="mb-4 text-xs text-muted-foreground">{set.code} · บทที่ {lesson.index} · {lesson.title}</p>
        <div className="mx-auto mb-4 inline-flex flex-col rounded-2xl bg-muted px-10 py-5">
          <div className="text-6xl leading-tight font-bold text-primary tabular-nums" aria-label="คะแนนรวม">
            {result.score}<span className="text-3xl text-muted-foreground"> / {result.total}</span>
          </div>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">คะแนนรวม (ข้อที่ไม่ได้ตอบนับเป็นผิด)</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={base + "/result?attempt=" + encodeURIComponent(attemptId)}>
              <CheckIcon />
              ดูผลวิเคราะห์
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={base}>กลับไปหน้าบทเรียน</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
