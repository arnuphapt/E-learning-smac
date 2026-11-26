"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, PlusIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuestionCard } from "./question-card"
import { MaterialPicker } from "@/components/master/materials/material-picker"
import { QuestionDialog } from "./question-dialog"
import { SwitchRow } from "./switch-row"
import { deleteTestQuestion, emptyQuestion, formFrom, saveTestQuestion, saveTestSettings, type TestForm, type TestKind } from "./test-actions"
import {
  maskTime,
  parseChoices,
  parseTestConfig,
  type LessonRow,
  type OnSaveLesson,
  type QuestionEditorItem,
  type QuestionRow,
} from "./types"

type Kind = TestKind

const DISABLED_HINT: Record<Kind, string> = {
  pre: "เปิดใช้งานที่สวิตช์ 'มีข้อสอบ Pre-test' ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)",
  post: "เปิดใช้งานที่สวิตช์ 'มีข้อสอบ Post-test' ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)",
}

/** "ข้อสอบ Pre/Post" tab: question list + test settings for the selected test. */
export function TestBuilder({ lesson, questions, onLoad, onSaveSettings }: { lesson: LessonRow; questions: QuestionRow[]; onLoad: () => void; onSaveSettings: OnSaveLesson }) {
  const [picked, setPicked] = useState<Kind>(lesson.has_pretest === false && lesson.has_posttest !== false ? "post" : "pre")
  const [forms, setForms] = useState<Record<Kind, TestForm>>(() => ({ pre: formFrom(parseTestConfig(lesson.pretest)), post: formFrom(parseTestConfig(lesson.posttest)) }))
  const [editing, setEditing] = useState<QuestionEditorItem | null>(null)

  // Settings are re-read whenever the lesson object is replaced (as before).
  const [seenLesson, setSeenLesson] = useState(lesson)
  if (seenLesson !== lesson) {
    setSeenLesson(lesson)
    setForms({ pre: formFrom(parseTestConfig(lesson.pretest)), post: formFrom(parseTestConfig(lesson.posttest)) })
  }

  // A switched-off test cannot stay selected while the other one is on.
  const which: Kind = picked === "pre" && !lesson.has_pretest && lesson.has_posttest ? "post" : picked === "post" && !lesson.has_posttest && lesson.has_pretest ? "pre" : picked
  const enabled: Record<Kind, boolean> = { pre: !!lesson.has_pretest, post: !!lesson.has_posttest }
  const form = forms[which]
  const patch = (p: Partial<TestForm>) => setForms((f) => ({ ...f, [which]: { ...f[which], ...p } }))
  const filteredQs = questions.filter((q) => q.kind === which)

  const handleSaveSettings = () => saveTestSettings({ lesson, kind: which, form, onSaveSettings })

  const handleSaveQuestion = async (nq: QuestionEditorItem) => {
    await saveTestQuestion({ lessonId: lesson.id, kind: which, nq, nextNo: filteredQs.length + 1, onLoad })
    setEditing(null)
  }

  const handleDeleteQuestion = (q: QuestionRow) => deleteTestQuestion({ lesson, questions, q, onLoad })

  const setPassing = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "")
    patch({ passing: cleaned === "" ? "" : Math.min(100, parseInt(cleaned, 10)) })
  }

  const openCreate = () => setEditing(emptyQuestion(filteredQs.length + 1))

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={which}
            onValueChange={(v) => {
              const k = v as Kind
              if (enabled[k]) setPicked(k)
              else toast.info(DISABLED_HINT[k])
            }}
          >
            <TabsList>
              {(["pre", "post"] as const).map((k) => (
                <TabsTrigger key={k} value={k} title={enabled[k] ? undefined : DISABLED_HINT[k]} aria-disabled={!enabled[k]} className={enabled[k] ? undefined : "cursor-not-allowed opacity-50"}>
                  {k === "pre" ? "Pre-test" : "Post-test"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon />
            เพิ่มข้อสอบ
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MaterialPicker key={which} kind={which} lessonId={lesson.id} onCopied={onLoad} disabled={filteredQs.length > 0 || !enabled[which]} />
        </div>
        {filteredQs.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            no={i + 1}
            onEdit={() =>
              setEditing({
                id: q.id,
                no: q.no,
                type: q.type,
                text: q.text || "",
                choices: Array.isArray(q.choices) ? parseChoices(q.choices) : [{ id: "a", text: "" }, { id: "b", text: "" }],
                answer: q.answer || "a",
              })
            }
            onDelete={() => handleDeleteQuestion(q)}
          />
        ))}
        <Button variant="outline" className="h-auto border-dashed py-4 text-muted-foreground" onClick={openCreate}>
          <PlusIcon />
          เพิ่มข้อสอบใหม่
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ตั้งค่าแบบทดสอบ {which === "pre" ? "ก่อนเรียน" : "หลังเรียน"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="คะแนนผ่าน (%)" htmlFor="test-passing-score">
            <Input id="test-passing-score" value={form.passing !== "" && form.passing != null ? form.passing + "%" : ""} onChange={(e) => setPassing(e.target.value)} placeholder="เช่น 60" />
          </FormField>
          <FormField label="เวลาทำ (นาที)" htmlFor="test-time-limit">
            <Input id="test-time-limit" value={form.time} onChange={(e) => patch({ time: e.target.value })} />
          </FormField>
          <FormField label="จำนวนครั้งที่ทำได้" htmlFor="test-attempts">
            <Select value={form.attempts} onValueChange={(v) => patch({ attempts: v })}>
              <SelectTrigger id="test-attempts" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 ครั้ง</SelectItem>
                <SelectItem value="2">2 ครั้ง</SelectItem>
                <SelectItem value="unlimited">ไม่จำกัด</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="กำหนดส่ง (วันที่)" htmlFor="test-due-date">
            <Input id="test-due-date" type="date" value={form.due} onChange={(e) => patch({ due: e.target.value })} />
          </FormField>
          <FormField label="เวลาที่กำหนดส่ง" htmlFor="test-due-time">
            <Input id="test-due-time" value={form.dueTime} onChange={(e) => patch({ dueTime: maskTime(e.target.value) })} placeholder="23:59" />
          </FormField>
          <div>
            <SwitchRow label={which === "pre" ? "ต้องทำ Pre-test ก่อนเข้าเรียน/ดูวิดีโอ" : "ต้องทำ Post-test หลังเรียน"} on={form.required} onChange={(val) => patch({ required: val })} />
            <SwitchRow label="สลับลำดับข้อสอบ" on={form.shuffle} onChange={(val) => patch({ shuffle: val })} />
            <SwitchRow label="แสดงเฉลยหลังส่ง" on={form.showAnswers} onChange={(val) => patch({ showAnswers: val })} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">รวม</span>
            <span className="font-bold">
              {filteredQs.length} ข้อ · {filteredQs.length} คะแนน
            </span>
          </div>
          <Button className="w-full" onClick={handleSaveSettings}>
            <CheckIcon />
            บันทึกเกณฑ์
          </Button>
        </CardContent>
      </Card>
      {editing && <QuestionDialog q={editing} onClose={() => setEditing(null)} onSave={handleSaveQuestion} />}
    </div>
  )
}
