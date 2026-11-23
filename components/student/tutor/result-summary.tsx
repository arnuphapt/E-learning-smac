import Link from "next/link"
import { PlayIcon } from "lucide-react"
import { ScoreRing } from "@/components/common/score-ring"
import { ToneBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { fmtDate } from "@/components/tutor/format"
import { PASS_PERCENT } from "@/lib/tutor-analysis"
import type { TutorLessonInfo } from "./exam-types"
import type { TutorResultResponse } from "./result-types"

/** Result header: set / pass / round badges, score ring, which round is on screen and the next actions. */
export function ResultSummary({ info, data, onLoad }: { info: TutorLessonInfo; data: TutorResultResponse; onLoad: (attemptId: string) => void }) {
  const { set, lesson } = info
  const { attempt, bestId, rounds, analysis } = data
  const { overall } = analysis
  const isBest = attempt.id === bestId
  const best = rounds.find((x) => x.id === bestId)
  const base = "/s/tutor/lesson/" + lesson.id
  return (
    <Card className="mb-4">
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge>{set.code}</Badge>
          <ToneBadge tone={overall.pass ? "success" : "danger"}>{overall.pass ? "ผ่าน" : "ไม่ผ่าน"}</ToneBadge>
          {isBest ? <ToneBadge tone="info">รอบที่ดีที่สุด</ToneBadge> : <Badge variant="outline">รอบที่ {attempt.number}</Badge>}
        </div>
        <h1 className="mb-4 text-xl font-bold">บทที่ {lesson.index} · {lesson.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-5">
          <ScoreRing value={attempt.score ?? 0} total={attempt.total ?? 0} size={140} label={"จาก " + attempt.total + " คะแนน"} />
          <div className="text-3xl font-bold tabular-nums" aria-label="คะแนนรวม">
            {attempt.score}<span className="text-xl text-muted-foreground"> / {attempt.total} ({overall.percent}%)</span>
          </div>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">คะแนนรวม (ข้อที่ไม่ได้ตอบนับเป็นผิด) · เกณฑ์ผ่าน {PASS_PERCENT}%</p>
        <p className="mb-4 text-sm text-muted-foreground">
          กำลังดูรอบที่ {attempt.number} จากที่ทำแล้ว {rounds.length} รอบ
          {attempt.status === "expired" ? " (หมดเวลา ระบบส่งให้)" : ""} · ส่งเมื่อ {fmtDate(attempt.submittedAt, true)}
          {!isBest && best && (
            <>
              {" · "}
              <Button variant="link" className="h-auto p-0 font-semibold" onClick={() => onLoad(best.id)}>
                ดูรอบที่ดีที่สุด (รอบที่ {best.number}: {best.score}/{best.total})
              </Button>
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href={base + "/exam"}>
              <PlayIcon />
              ทำอีกครั้ง
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
