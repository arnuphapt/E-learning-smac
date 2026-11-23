"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, PlusIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Json } from "@/lib/database.types"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuestionCard } from "./question-card"
import { QuestionDialog } from "./question-dialog"
import { SwitchRow } from "./switch-row"
import {
  getTodayStr,
  maskTime,
  parseChoices,
  parseTestConfig,
  type LessonRow,
  type OnSaveLesson,
  type QuestionEditorItem,
  type QuestionRow,
  type TestConfig,
} from "./types"

type Kind = "pre" | "post"

interface TestForm {
  passing: number | string
  time: number | string
  attempts: string
  shuffle: boolean
  showAnswers: boolean
  due: string
  dueTime: string
  required: boolean
}

const formFrom = (cfg: TestConfig): TestForm => ({
  passing: cfg.passing_score ?? 50,
  time: cfg.time_limit ?? 30,
  attempts: cfg.attempts ?? "1",
  shuffle: cfg.shuffle ?? true,
  showAnswers: cfg.show_answers ?? true,
  due: cfg.due || getTodayStr(),
  dueTime: cfg.due_time ?? "23:59",
  required: cfg.required ?? true,
})

const emptyQuestion = (no: number): QuestionEditorItem => ({
  no,
  type: "single",
  text: "",
  choices: [
    { id: "a", text: "" },
    { id: "b", text: "" },
  ],
  answer: "a",
  id: "temp_" + Date.now(),
})

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

  const handleSaveSettings = async () => {
    const config = {
      ...parseTestConfig(which === "pre" ? lesson.pretest : lesson.posttest),
      required: form.required,
      passing_score: form.passing === "" || form.passing === "—" ? null : parseInt(String(form.passing)) || 0,
      time_limit: parseInt(String(form.time)) || 0,
      attempts: form.attempts,
      shuffle: form.shuffle,
      show_answers: form.showAnswers,
      due: form.due || null,
      due_time: form.dueTime || null,
    } as Json
    await onSaveSettings(which === "pre" ? { pretest: config } : { posttest: config })
  }

  const handleSaveQuestion = async (nq: QuestionEditorItem) => {
    const fields = { type: nq.type || "single", text: nq.text, choices: nq.choices as unknown as Json, answer: nq.answer, lesson_id: lesson.id, kind: which }
    if (nq.id && !String(nq.id).startsWith("temp_")) {
      const { error } = await supabase.from("questions").update({ no: nq.no, ...fields }).eq("id", nq.id)
      if (error) toast.error("เกิดข้อผิดพลาด: " + error.message)
      else {
        toast.success("บันทึกข้อสอบแล้ว")
        onLoad()
      }
    } else {
      const { error } = await supabase.from("questions").insert([{ id: "q_" + Date.now(), no: filteredQs.length + 1, ...fields }])
      if (error) toast.error("เกิดข้อผิดพลาด: " + error.message)
      else {
        toast.success("เพิ่มข้อสอบใหม่เรียบร้อยแล้ว")
        onLoad()
      }
    }
    setEditing(null)
  }

  const handleDeleteQuestion = async (q: QuestionRow) => {
    const remainingCount = questions.filter((x) => x.kind === q.kind && x.id !== q.id).length
    const isReq = q.kind === "pre" ? parseTestConfig(lesson.pretest).required : parseTestConfig(lesson.posttest).required
    if (isReq && remainingCount === 0) {
      toast.warning(`ไม่สามารถลบได้ เนื่องจากบทเรียนนี้กำหนดให้ต้องทำ ${q.kind === "pre" ? "Pre-test" : "Post-test"} แต่ระบบต้องการข้อสอบอย่างน้อย 1 ข้อ (กรุณาปิดการตั้งค่าความจำเป็นก่อนลบข้อสอบสุดท้าย)`)
      return
    }
    const { error } = await supabase.from("questions").delete().eq("id", q.id)
    if (error) toast.error("เกิดข้อผิดพลาด: " + error.message)
    else {
      toast.success("ลบข้อสอบเรียบร้อยแล้ว")
      onLoad()
    }
  }

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
