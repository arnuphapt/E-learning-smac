import { BarChart3Icon, CheckCircle2Icon, SparklesIcon, XCircleIcon } from "lucide-react"
import { ScoreRing } from "@/components/common/score-ring"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { LessonRow } from "@/components/student/lesson/types"

/** Result header: score ring, correct / wrong counts and (post-test) the gain over the pre-test. */
export function ResultSummary({
  kind,
  lesson,
  total,
  score,
  preScore,
  postScore,
}: {
  kind: string
  lesson: LessonRow
  total: number
  score: number
  preScore: number
  postScore: number
}) {
  const diff = postScore - preScore
  return (
    <Card className="mb-5 gap-0 py-0">
      <CardHeader className="gap-1 border-b py-6 md:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <CheckCircle2Icon className="size-4" />
          ส่งคำตอบเรียบร้อยแล้ว
        </div>
        <h1 className="text-2xl font-bold">{kind === "pre" ? "ผลแบบทดสอบก่อนเรียน" : "ผลแบบทดสอบหลังเรียน"}</h1>
        <p className="text-sm text-muted-foreground">บทที่ {lesson.index} · {lesson.title}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-6 py-6 md:px-8">
        <ScoreRing value={score} total={total} size={140} label={"จาก " + total + " คะแนน"} />
        <div className="min-w-56 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-success"><CheckCircle2Icon className="size-4" />ตอบถูก</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{score} <span className="text-sm font-medium text-muted-foreground">ข้อ</span></div>
            </div>
            <div className="rounded-xl bg-muted p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-destructive"><XCircleIcon className="size-4" />ตอบผิด</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{total - score} <span className="text-sm font-medium text-muted-foreground">ข้อ</span></div>
            </div>
          </div>
          {kind === "post" ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-sm text-success">
              <BarChart3Icon className="size-4 shrink-0" />
              <span>พัฒนาการจาก Pre-test: <b>{diff >= 0 ? `+${diff}` : diff} คะแนน</b> ({preScore} → {postScore})</span>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground text-pretty">
              <SparklesIcon className="size-4 shrink-0 text-primary" />
              คะแนนนี้ใช้เพื่อประเมินความรู้พื้นฐานก่อนเรียน ระบบได้ปลดล็อกวิดีโอบทเรียนให้แล้ว
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
