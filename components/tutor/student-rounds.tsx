"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { roundsOf, formatDuration, type ResultAttemptInput, type ResultUserRow, type StudentLessonSummary } from "@/lib/tutor-results"
import type { TutorResult } from "@/lib/tutor-analysis"
import { LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { fmtDate } from "./format"
import { RoundReview, type ReviewQuestion } from "./round-review"
import { TopicBars } from "./topic-bars"

type AttemptDetail =
  | { result: TutorResult; qs: Map<string, ReviewQuestion>; error?: undefined }
  | { error: true; result?: undefined; qs?: undefined }

interface StudentRoundsProps {
  student: StudentLessonSummary
  user: ResultUserRow | undefined
  lesson: { id: string; index?: number | null; title?: string | null }
  attempts: readonly ResultAttemptInput[]
  onClose: () => void
}

// Side panel of one student: their ended rounds, and the stored result of the chosen round (topic bars + per-question review).
// The result is read from tutor_attempts.result (what the student saw); question text / choices are read live from `questions`.
// attempts: every attempt row of the lesson (already loaded by the tab); only this student's are used. Mounted only while open.
export function StudentRounds({ student, user, lesson, attempts, onClose }: StudentRoundsProps) {
  const rounds = roundsOf(attempts, student.student_id)
  const [picked, setPicked] = useState(student.best.id)
  const [detail, setDetail] = useState<Record<string, AttemptDetail>>({}) // attemptId -> { result, qs } | { error }
  const cur = detail[picked]

  useEffect(() => {
    if (detail[picked]) return
    let cancelled = false
    ;(async (): Promise<AttemptDetail> => {
      const { data, error } = await supabase.from("tutor_attempts").select("result").eq("id", picked).maybeSingle()
      if (error || !data?.result) return { error: true }
      const result = data.result as unknown as TutorResult
      const ids = result.rows.map((r) => r.question_id)
      const { data: qs, error: qErr } = ids.length
        ? await supabase.from("questions").select("id, text, choices").in("id", ids).eq("lesson_id", lesson.id).eq("kind", "tutor")
        : { data: [] as ReviewQuestion[], error: null }
      if (qErr) return { error: true }
      return { result, qs: new Map((qs || []).map((q) => [q.id, q])) }
    })()
      .catch((): AttemptDetail => ({ error: true }))
      .then((r) => {
        if (!cancelled) setDetail((d) => ({ ...d, [picked]: r }))
      })
    return () => {
      cancelled = true
    }
  }, [picked, lesson.id, detail])

  const round = rounds.find((r) => r.id === picked)
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl" aria-label={"ผลของ " + (user?.name || "นักศึกษา")}>
        <SheetHeader className="border-b">
          <SheetTitle className="truncate">{user?.name || "(ไม่พบผู้ใช้)"}</SheetTitle>
          <SheetDescription>
            {user?.student_no ? <span className="font-mono">{user.student_no}</span> : "ไม่มีรหัสนักศึกษา"} · บทที่ {lesson.index} {lesson.title}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            <div className="mb-2 text-sm font-semibold">รอบที่ทำแล้ว ({rounds.length})</div>
            <div className="flex flex-wrap gap-2">
              {rounds.map((r) => (
                <Button
                  key={r.id}
                  variant={r.id === picked ? "secondary" : "outline"}
                  className={cn("h-auto flex-col items-start gap-0.5 px-3 py-2 text-left", r.id === picked && "border-primary")}
                  onClick={() => setPicked(r.id)}
                  aria-pressed={r.id === picked}
                >
                  <b>รอบที่ {r.number}</b>
                  <span className="text-xs font-normal">
                    {r.score}/{r.total} · {r.percent}%
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{formatDuration(r.seconds)}</span>
                  {r.id === student.best.id && <em className="text-xs font-semibold not-italic text-success">ดีที่สุด</em>}
                </Button>
              ))}
            </div>
            {round && (
              <div className="mt-2 text-sm text-muted-foreground">
                {fmtDate(round.submittedAt || round.startedAt, true)} · ใช้เวลา {formatDuration(round.seconds)}
                {round.status === "expired" ? " · หมดเวลา ระบบส่งให้" : ""}
              </div>
            )}

            {!cur && <LoadingState />}
            {cur?.error && (
              <div role="alert" className="mt-4 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                โหลดผลของรอบนี้ไม่สำเร็จ ลองเลือกรอบอีกครั้ง
              </div>
            )}
            {cur?.result && (
              <>
                <div className="mb-2 mt-5 text-sm font-semibold">ผลรายหัวข้อ</div>
                <TopicBars bars={cur.result.analysis.groups.map((g) => ({ key: g.topic_id ?? "none", name: g.name, percent: g.percent, status: g.status }))} />
                <div className="mb-1 mt-5 text-sm font-semibold">ทบทวนรายข้อ ({cur.result.rows.length} ข้อ)</div>
                <div className="grid gap-3">
                  {cur.result.rows.map((row, i) => (
                    <RoundReview key={row.question_id + i} n={i + 1} row={row} q={cur.qs.get(row.question_id)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
