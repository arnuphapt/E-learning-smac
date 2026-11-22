"use client"

import { CheckIcon, MessageSquareIcon, TargetIcon } from "lucide-react"
import type { RubricCriterion } from "@/components/lesson/types"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

/** Rubric scoring (one button row per criterion), feedback, total and the save buttons. */
export function RubricPanel({
  title,
  criteria,
  scores,
  onScore,
  feedback,
  onFeedback,
  points,
  onSave,
}: {
  title?: string
  criteria: RubricCriterion[]
  scores: Record<string, number>
  onScore: (criterionId: string, value: number) => void
  feedback: string
  onFeedback: (v: string) => void
  /** Assignment full marks (null = 100). */
  points: number | null
  onSave: (graded: boolean) => void
}) {
  const total = Object.values(scores).reduce((s, v) => s + v, 0)
  return (
    <Card>
      <CardContent className="grid gap-4">
        <div>
          <div className="flex items-center gap-2 text-base font-bold">
            <TargetIcon className="size-4 text-primary" />
            ให้คะแนนตาม Rubric
          </div>
          <div className="text-xs text-muted-foreground">{title}</div>
        </div>

        <div className="grid gap-3">
          {criteria.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
                <div className="whitespace-nowrap text-sm font-bold tabular-nums">
                  <span className="text-primary">{scores[c.id] || 0}</span>
                  <span className="text-muted-foreground">/{c.max}</span>
                </div>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={1}
                aria-label={`คะแนน ${c.name}`}
                value={scores[c.id] != null ? String(scores[c.id]) : ""}
                onValueChange={(v) => v && onScore(c.id, Number(v))}
                className="flex w-full flex-wrap"
              >
                {Array.from({ length: c.max + 1 }).map((_, n) => (
                  <ToggleGroupItem key={n} value={String(n)} aria-label={`${n} คะแนน`} className="min-w-8 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ))}
        </div>

        <FormField
          htmlFor="grade-feedback"
          label={
            <span className="flex items-center gap-2">
              <MessageSquareIcon className="size-4 text-primary" />
              ข้อเสนอแนะถึงนักศึกษา
            </span>
          }
        >
          <Textarea id="grade-feedback" rows={4} value={feedback} onChange={(e) => onFeedback(e.target.value)} placeholder="เขียนคำแนะนำ จุดเด่น และสิ่งที่ควรพัฒนา…" />
        </FormField>

        <div className="rounded-lg bg-muted p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">คะแนนรวม</span>
            <span className="text-2xl font-bold tabular-nums text-primary">
              {total}
              <span className="text-base font-medium text-muted-foreground">/{points}</span>
            </span>
          </div>
          <Progress className="mt-2" aria-label="คะแนนรวม" value={(total / (points ?? 100)) * 100} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onSave(false)}>
            บันทึกร่าง
          </Button>
          <Button className="flex-1" onClick={() => onSave(true)}>
            <CheckIcon />
            ให้คะแนน
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
