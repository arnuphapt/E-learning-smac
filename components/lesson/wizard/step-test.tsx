"use client"

import { useState } from "react"
import { CheckIcon, ChevronDownIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { DatePicker } from "@/components/common/date-picker"
import { FormField } from "@/components/common/form-field"
import { TimePicker } from "@/components/common/time-picker"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { QuestionDialog } from "@/components/lesson/question-dialog"
import { SwitchRow } from "@/components/lesson/switch-row"
import { deleteTestQuestion, emptyQuestion, formFrom, saveTestQuestion, saveTestSettings, type TestForm, type TestKind } from "@/components/lesson/test-actions"
import { parseChoices, parseTestConfig, type LessonRow, type OnSaveLesson, type QuestionEditorItem, type QuestionRow } from "@/components/lesson/types"
import { cn } from "@/lib/utils"
import { MaterialPicker } from "@/components/master/materials/material-picker"

/** Step 4: Pre/Post-test settings and compact question list (flat, no cards). */
export function StepTest({
  lesson,
  questions,
  onLoad,
  onSaveSettings,
}: {
  lesson: LessonRow
  questions: QuestionRow[]
  onLoad: () => void
  onSaveSettings: OnSaveLesson
}) {
  const hasPre = Boolean(lesson.has_pretest)
  const hasPost = Boolean(lesson.has_posttest)
  const [picked, setPicked] = useState<TestKind>(!hasPre && hasPost ? "post" : "pre")
  const [forms, setForms] = useState<Record<TestKind, TestForm>>(() => ({
    pre: formFrom(parseTestConfig(lesson.pretest)),
    post: formFrom(parseTestConfig(lesson.posttest)),
  }))
  const [moreOpen, setMoreOpen] = useState(false)
  const [editing, setEditing] = useState<QuestionEditorItem | null>(null)

  const [seenLesson, setSeenLesson] = useState(lesson)
  if (seenLesson !== lesson) {
    setSeenLesson(lesson)
    setForms({ pre: formFrom(parseTestConfig(lesson.pretest)), post: formFrom(parseTestConfig(lesson.posttest)) })
  }

  const which: TestKind = picked === "pre" && !hasPre && hasPost ? "post" : picked === "post" && !hasPost && hasPre ? "pre" : picked
  const form = forms[which]
  const patch = (p: Partial<TestForm>) => setForms((f) => ({ ...f, [which]: { ...f[which], ...p } }))
  const filteredQs = questions.filter((q) => q.kind === which)

  const setPassing = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "")
    patch({ passing: cleaned === "" ? "" : Math.min(100, parseInt(cleaned, 10)) })
  }

  const handleSaveSettings = () => saveTestSettings({ lesson, kind: which, form, onSaveSettings })

  const handleSaveQuestion = async (nq: QuestionEditorItem) => {
    await saveTestQuestion({ lessonId: lesson.id, kind: which, nq, nextNo: filteredQs.length + 1, onLoad })
    setEditing(null)
  }

  const openCreate = () => setEditing(emptyQuestion(filteredQs.length + 1))

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {hasPre && hasPost ? (
          <ToggleGroup
            type="single"
            variant="outline"
            value={which}
            onValueChange={(v) => {
              if (v === "pre" || v === "post") setPicked(v)
            }}
          >
            <ToggleGroupItem value="pre">Pre-test ({questions.filter((q) => q.kind === "pre").length})</ToggleGroupItem>
            <ToggleGroupItem value="post">Post-test ({questions.filter((q) => q.kind === "post").length})</ToggleGroupItem>
          </ToggleGroup>
        ) : (
          <h3 className="text-sm font-semibold">{which === "pre" ? "ข้อสอบ Pre-test" : "ข้อสอบ Post-test"}</h3>
        )}
        <Button type="button" size="sm" variant="outline" onClick={handleSaveSettings}>
          <CheckIcon />
          บันทึกเกณฑ์
        </Button>
      </div>

      <section className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="คะแนนผ่าน (%)" htmlFor="wizard-test-passing">
            <Input
              id="wizard-test-passing"
              value={form.passing !== "" && form.passing != null ? String(form.passing) : ""}
              onChange={(e) => setPassing(e.target.value)}
              placeholder="เช่น 60"
            />
          </FormField>
          <FormField label="เวลาทำ (นาที)" htmlFor="wizard-test-time">
            <Input id="wizard-test-time" value={form.time} onChange={(e) => patch({ time: e.target.value })} />
          </FormField>
          <FormField label="จำนวนครั้ง" htmlFor="wizard-test-attempts">
            <Select value={form.attempts} onValueChange={(v) => patch({ attempts: v })}>
              <SelectTrigger id="wizard-test-attempts" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 ครั้ง</SelectItem>
                <SelectItem value="2">2 ครั้ง</SelectItem>
                <SelectItem value="unlimited">ไม่จำกัด</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
          <Label htmlFor="wizard-test-required" className="font-normal">
            {which === "pre" ? "ต้องทำ Pre-test ก่อนเรียน" : "ต้องทำ Post-test หลังเรียน"}
          </Label>
          <Switch id="wizard-test-required" checked={form.required} onCheckedChange={(val) => patch({ required: val })} />
        </div>

        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <span>ตั้งค่าเพิ่มเติม (กำหนดส่ง · สลับข้อ · เฉลย)</span>
            <ChevronDownIcon className={cn("size-4 transition-transform", moreOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="กำหนดส่ง (วันที่)" htmlFor="wizard-test-due">
                <DatePicker id="wizard-test-due" value={form.due} onChange={(v) => patch({ due: v })} />
              </FormField>
              <FormField label="เวลาที่กำหนดส่ง" htmlFor="wizard-test-due-time">
                <TimePicker id="wizard-test-due-time" value={form.dueTime} onChange={(v) => patch({ dueTime: v })} />
              </FormField>
            </div>
            <div>
              <SwitchRow label="สลับลำดับข้อสอบ" on={form.shuffle} onChange={(val) => patch({ shuffle: val })} />
              <SwitchRow label="แสดงเฉลยหลังส่ง" on={form.showAnswers} onChange={(val) => patch({ showAnswers: val })} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <MaterialPicker key={which} kind={which} lessonId={lesson.id} onCopied={onLoad} disabled={filteredQs.length > 0} />
      </div>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">รายการคำถาม ({filteredQs.length} ข้อ)</h4>
          <Button type="button" size="sm" onClick={openCreate}>
            <PlusIcon />
            เพิ่มคำถาม
          </Button>
        </div>

        {filteredQs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อสอบในส่วนนี้</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              <PlusIcon />
              เพิ่มคำถามข้อแรก
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
            {filteredQs.map((q, i) => {
              const choices = Array.isArray(q.choices) ? parseChoices(q.choices) : []
              return (
                <li key={q.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{q.text || "(ยังไม่มีโจทย์)"}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {choices.length} ตัวเลือก · เฉลย {(q.answer || "a").toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`แก้ไขข้อที่ ${i + 1}`}
                      onClick={() =>
                        setEditing({
                          id: q.id,
                          no: q.no,
                          type: q.type,
                          text: q.text || "",
                          choices: choices.length > 0 ? choices : [{ id: "a", text: "" }, { id: "b", text: "" }],
                          answer: q.answer || "a",
                        })
                      }
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={`ลบข้อที่ ${i + 1}`}
                      onClick={() => void deleteTestQuestion({ lesson, questions, q, onLoad })}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {editing && <QuestionDialog q={editing} onClose={() => setEditing(null)} onSave={handleSaveQuestion} />}
    </div>
  )
}
