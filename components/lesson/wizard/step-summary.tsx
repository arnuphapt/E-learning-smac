"use client"

import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { parseDocs, parseTestConfig, type AssignmentRow, type LessonRow, type LessonUpdate, type QuestionRow } from "@/components/lesson/types"
import type { WizardStepKey } from "./wizard-types"

/** Step 6: readiness checklist with quick-jump links and publish status control. */
export function StepSummary({
  lesson,
  isTutor,
  questions,
  assignments,
  onJump,
  onSave,
}: {
  lesson: LessonRow
  isTutor: boolean
  questions: QuestionRow[]
  assignments: AssignmentRow[]
  onJump: (step: WizardStepKey) => void
  onSave: (fields: LessonUpdate, silent?: boolean) => Promise<void>
}) {
  const docs = parseDocs(lesson.documents)
  const preCount = questions.filter((q) => q.kind === "pre").length
  const postCount = questions.filter((q) => q.kind === "post").length
  const preConfig = parseTestConfig(lesson.pretest)
  const postConfig = parseTestConfig(lesson.posttest)

  const dueSummary = assignments
    .map((a) => (a.due ? `${a.due}${a.due_time ? ` ${a.due_time}` : ""}` : null))
    .filter((d): d is string => Boolean(d))

  type SummaryRow = {
    key: string
    label: string
    detail: string
    ok: boolean
    step: WizardStepKey
    show: boolean
  }

  const allRows: SummaryRow[] = [
    {
      key: "video",
      label: "วิดีโอบทเรียน",
      detail: lesson.video || lesson.video_url ? "มีวิดีโอแล้ว" : "ยังไม่มีวิดีโอ",
      ok: Boolean(lesson.video || lesson.video_url),
      step: "video",
      show: true,
    },
    {
      key: "docs",
      label: "เอกสารประกอบการเรียน",
      detail: `${docs.length} ไฟล์`,
      ok: docs.length > 0,
      step: "docs",
      show: Boolean(lesson.has_docs),
    },
    {
      key: "pre",
      label: "ข้อสอบ Pre-test",
      detail: `${preCount} ข้อ${preConfig.required ? " · บังคับทำก่อนเรียน" : ""}`,
      ok: preCount > 0,
      step: "test",
      show: !isTutor && Boolean(lesson.has_pretest),
    },
    {
      key: "post",
      label: "ข้อสอบ Post-test",
      detail: `${postCount} ข้อ${postConfig.required ? " · บังคับทำ" : ""}`,
      ok: postCount > 0,
      step: "test",
      show: !isTutor && Boolean(lesson.has_posttest),
    },
    {
      key: "assign",
      label: "ใบงาน",
      detail:
        assignments.length > 0
          ? `${assignments.length} ชิ้น${dueSummary.length > 0 ? ` · กำหนดส่ง ${dueSummary.join(", ")}` : ""}`
          : "ยังไม่มีใบงาน",
      ok: assignments.length > 0,
      step: "assign",
      show: !isTutor && Boolean(lesson.has_assignment),
    },
  ]
  const rows = allRows.filter((r) => r.show)

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">ตรวจสอบความพร้อมก่อนเผยแพร่</h3>
          <p className="text-xs text-muted-foreground">สรุปรายการที่มีในบทเรียนนี้ หากส่วนใดยังไม่ครบสามารถกด “ไปแก้” เพื่อย้อนกลับไปจัดการได้</p>
        </div>

        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{row.label}</div>
                <div className="text-xs text-muted-foreground">{row.detail}</div>
              </div>
              <div className="flex items-center gap-2">
                <ToneBadge tone={row.ok ? "success" : "warning"}>{row.ok ? "พร้อม" : "ยังไม่ครบ"}</ToneBadge>
                {!row.ok && (
                  <Button type="button" variant="link" size="sm" className="h-auto px-1" onClick={() => onJump(row.step)}>
                    ไปแก้
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <Label>สถานะการเผยแพร่</Label>
          <p className="text-xs text-muted-foreground">กด “เสร็จสิ้น” เพื่อปิดหน้าต่างและอัปเดตรายการบทเรียน</p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={lesson.status || "draft"}
          onValueChange={(val) => {
            if (val) void onSave({ status: val }, false)
          }}
        >
          <ToggleGroupItem value="draft">ฉบับร่าง</ToggleGroupItem>
          <ToggleGroupItem value="active">เผยแพร่</ToggleGroupItem>
        </ToggleGroup>
      </section>
    </div>
  )
}
