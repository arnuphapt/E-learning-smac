"use client"

import { useState } from "react"
import { ArrowLeftIcon, CheckIcon, FileIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { DatePicker } from "@/components/common/date-picker"
import { FormField } from "@/components/common/form-field"
import { ToneBadge } from "@/components/common/status-badge"
import { TimePicker } from "@/components/common/time-picker"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { saveAssignmentWithRubric, useDeleteAssignment } from "@/components/lesson/assignment-actions"
import { MaterialPicker } from "@/components/master/materials/material-picker"
import { getTodayStr, parseCriteria, type AssignmentRow, type LessonRow, type RubricCriterion, type RubricRow } from "@/components/lesson/types"

function OptionCheck({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Label htmlFor={id} className="cursor-pointer gap-2 rounded-lg border px-3 py-2 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-soft has-data-[state=checked]:font-semibold">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </Label>
  )
}

function AssignmentDetailForm({
  lesson,
  assignment,
  rubric,
  onBack,
  onSaved,
}: {
  lesson: LessonRow
  assignment: AssignmentRow | null
  rubric: RubricRow | null | undefined
  onBack: () => void
  onSaved: () => void
}) {
  const deleteAssignment = useDeleteAssignment()
  const a: Partial<AssignmentRow> = assignment || {
    title: "",
    instructions: "",
    due: "",
    due_time: "23:59",
    allow_late: false,
    allow_file: true,
    allow_text: true,
  }

  const [title, setTitle] = useState(a.title || "")
  const [titleError, setTitleError] = useState<string | null>(null)
  const [instructions, setInstructions] = useState(a.instructions || "")
  const [due, setDue] = useState(a.due || getTodayStr())
  const [dueTime, setDueTime] = useState(a.due_time || "23:59")
  const [allowLate, setAllowLate] = useState(a.allow_late ?? false)
  const [allowFile, setAllowFile] = useState(a.allow_file ?? true)
  const [allowText, setAllowText] = useState(a.allow_text ?? true)
  const [criteria, setCriteria] = useState<RubricCriterion[]>(parseCriteria(rubric?.criteria))
  const [saving, setSaving] = useState(false)

  const total = criteria.reduce((s, c) => s + c.max, 0)
  const patchCriterion = (id: string, p: Partial<RubricCriterion>) => setCriteria((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!title.trim()) {
      setTitleError("กรุณากรอกชื่อใบงาน")
      return
    }
    setTitleError(null)
    setSaving(true)
    try {
      const ok = await saveAssignmentWithRubric({
        lesson,
        assignmentId: a.id,
        rubricId: rubric?.id,
        title: title.trim(),
        instructions,
        due,
        dueTime,
        allowLate,
        allowFile,
        allowText,
        criteria,
      })
      if (ok) {
        onSaved()
        onBack()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!a.id) return
    if (await deleteAssignment({ id: a.id, title, rubric_id: a.rubric_id ?? null })) {
      onSaved()
      onBack()
    }
  }

  return (
    <form noValidate className="grid gap-5" onSubmit={handleSave}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon />
          กลับไปรายการ
        </Button>
        <span className="text-sm font-semibold">{a.id ? "แก้ไขใบงาน" : "เพิ่มใบงานใหม่"}</span>
      </div>

      <section className="grid gap-4">
        <FormField label="ชื่อใบงาน" htmlFor="wizard-asg-title" required error={titleError}>
          <Input
            id="wizard-asg-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError(null)
            }}
            placeholder="เช่น ใบงานวิเคราะห์กรณีศึกษา"
            autoFocus
          />
        </FormField>

        <FormField label="คำชี้แจง" htmlFor="wizard-asg-instructions">
          <Textarea id="wizard-asg-instructions" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="กำหนดส่ง" htmlFor="wizard-asg-due">
            <DatePicker id="wizard-asg-due" value={due} onChange={setDue} />
          </FormField>
          <FormField label="เวลา" htmlFor="wizard-asg-due-time">
            <TimePicker id="wizard-asg-due-time" value={dueTime} onChange={setDueTime} />
          </FormField>
          <FormField label="คะแนนเต็ม" htmlFor="wizard-asg-points">
            <Input id="wizard-asg-points" value={total} readOnly />
          </FormField>
        </div>

        <div className="grid gap-2">
          <Label>รูปแบบการส่งงาน</Label>
          <div className="flex flex-wrap gap-2">
            <OptionCheck id="wizard-asg-file" label="แนบไฟล์ (PDF/DOCX/รูปภาพ)" checked={allowFile} onChange={setAllowFile} />
            <OptionCheck id="wizard-asg-text" label="พิมพ์ข้อความตอบ" checked={allowText} onChange={setAllowText} />
            <OptionCheck id="wizard-asg-late" label="อนุญาตให้ส่งล่าช้า" checked={allowLate} onChange={setAllowLate} />
          </div>
        </div>
      </section>

      <Separator />

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">เกณฑ์การให้คะแนน (Rubric)</h4>
            <p className="text-xs text-muted-foreground">กำหนดเกณฑ์ย่อยและคะแนนเต็มของแต่ละเกณฑ์</p>
          </div>
          <ToneBadge tone="primary">รวม {total} คะแนน</ToneBadge>
        </div>

        {criteria.map((c, i) => (
          <div key={c.id} className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="grid flex-1 gap-2">
              <Input
                aria-label={"ชื่อเกณฑ์ที่ " + (i + 1)}
                className="font-medium"
                value={c.name}
                onChange={(e) => patchCriterion(c.id, { name: e.target.value })}
                placeholder={"เกณฑ์ที่ " + (i + 1)}
              />
              <Input
                aria-label={"คำอธิบายเกณฑ์ที่ " + (i + 1)}
                value={c.desc || ""}
                onChange={(e) => patchCriterion(c.id, { desc: e.target.value })}
                placeholder="คำอธิบายเกณฑ์ (ระดับคะแนนเต็ม)"
              />
            </div>
            <div className="grid w-24 shrink-0 gap-1">
              <Label htmlFor={`wizard-crit-max-${c.id}`} className="text-xs text-muted-foreground">
                คะแนนเต็ม
              </Label>
              <Input
                id={`wizard-crit-max-${c.id}`}
                className="text-center font-semibold tabular-nums"
                value={c.max}
                onChange={(e) => patchCriterion(c.id, { max: Math.max(0, +e.target.value || 0) })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-5 text-destructive hover:text-destructive"
              aria-label={`ลบเกณฑ์ที่ ${i + 1}`}
              onClick={() => setCriteria(criteria.filter((x) => x.id !== c.id))}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="ghost" size="sm" className="w-fit text-primary" onClick={() => setCriteria([...criteria, { id: "rc" + Date.now(), name: "", desc: "", max: 5 }])}>
          <PlusIcon />
          เพิ่มเกณฑ์
        </Button>
      </section>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {a.id ? (
          <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => void handleDelete()} disabled={saving}>
            <Trash2Icon />
            ลบใบงาน
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            บันทึกใบงาน
          </Button>
        </div>
      </div>
    </form>
  )
}

/** Step 5: master-detail assignments list and inline editor (no cards, no sheet). */
export function StepAssignments({
  lesson,
  assignments,
  rubrics,
  onReload,
}: {
  lesson: LessonRow
  assignments: AssignmentRow[]
  rubrics: RubricRow[]
  onReload: () => void
}) {
  const deleteAssignment = useDeleteAssignment()
  const [editing, setEditing] = useState<Partial<AssignmentRow> | null>(null)

  if (editing) {
    const asg = editing.id ? (editing as AssignmentRow) : null
    const rubric = editing.rubric_id ? rubrics.find((r) => r.id === editing.rubric_id) : null
    return (
      <AssignmentDetailForm
        key={editing.id ?? "new"}
        lesson={lesson}
        assignment={asg}
        rubric={rubric}
        onBack={() => setEditing(null)}
        onSaved={onReload}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">ใบงานในบทเรียน ({assignments.length})</h3>
          <p className="text-xs text-muted-foreground">เลือกใบงานเพื่อแก้ไขรายละเอียดและเกณฑ์การให้คะแนน</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MaterialPicker kind="assignment" lessonId={lesson.id} onCopied={onReload} />
          <Button type="button" size="sm" onClick={() => setEditing({})}>
            <PlusIcon />
            เพิ่มใบงาน
          </Button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">ยังไม่มีใบงานในบทเรียนนี้</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing({})}>
            <PlusIcon />
            เพิ่มใบงานแรก
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
          {assignments.map((a) => {
            const rubric = a.rubric_id ? rubrics.find((r) => r.id === a.rubric_id) : null
            const criteriaCount = parseCriteria(rubric?.criteria).length
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileIcon className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.title || "(ไม่มีชื่อใบงาน)"}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      กำหนดส่ง {a.due || "—"} {a.due_time || ""} · {criteriaCount} เกณฑ์ · {a.points ?? 0} คะแนน
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`แก้ไขใบงาน ${a.title}`} onClick={() => setEditing(a)}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={`ลบใบงาน ${a.title}`}
                    onClick={async () => {
                      if (await deleteAssignment(a)) onReload()
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
