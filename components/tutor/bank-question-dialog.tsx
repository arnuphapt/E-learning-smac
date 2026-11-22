"use client"

import { useState } from "react"
import { CheckIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { uniqueChoiceId } from "@/lib/questions"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

type TutorTopicRow = Database["public"]["Tables"]["tutor_topics"]["Row"]

export interface BankChoice {
  id: string
  text: string
}

export interface QuestionForm {
  id: string | null
  text: string
  choices: BankChoice[]
  answer: string
  explanation: string
  topicName: string
}

export const blankQuestion = (): QuestionForm => ({
  id: null,
  text: "",
  choices: [{ id: "a", text: "" }, { id: "b", text: "" }],
  answer: "a",
  explanation: "",
  topicName: "",
})

const hint = (text: string) => <span className="font-normal text-muted-foreground">— {text}</span>

/** Add / edit one bank question. Mount only while open so the form resets. */
export function BankQuestionDialog({
  q,
  topics,
  onClose,
  onSave,
}: {
  q: QuestionForm
  topics: TutorTopicRow[]
  onClose: () => void
  onSave: (q: QuestionForm) => Promise<void>
}) {
  const [text, setText] = useState(q.text)
  const [choices, setChoices] = useState(q.choices)
  const [answer, setAnswer] = useState(q.answer)
  const [explanation, setExplanation] = useState(q.explanation)
  const [topicName, setTopicName] = useState(q.topicName)
  const [saving, setSaving] = useState(false)

  const setC = (id: string, v: string) => setChoices((cs) => cs.map((c) => (c.id === id ? { ...c, text: v } : c)))
  const addC = () => setChoices((cs) => [...cs, { id: uniqueChoiceId(), text: "" }])
  // Ids are never re-lettered and never reused (uniqueChoiceId): tutor_answers.chosen and the settled result store them and
  // the review reads the choices live. Labels A, B, C... below are by position. Deleting the current answer leaves none
  // selected (submit asks for a new pick).
  const removeC = (id: string) => {
    setChoices(choices.filter((c) => c.id !== id))
    if (answer === id) setAnswer("")
  }

  const submit = async () => {
    if (!text.trim()) return toast.error("กรุณาพิมพ์โจทย์คำถาม")
    if (choices.some((c) => !c.text.trim())) return toast.error("กรุณากรอกตัวเลือกให้ครบทุกข้อ")
    if (!choices.some((c) => c.id === answer)) return toast.error("กรุณาเลือกคำตอบที่ถูกต้อง")
    setSaving(true)
    await onSave({ ...q, text: text.trim(), choices, answer, explanation: explanation.trim(), topicName })
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{q.id ? "แก้ไขข้อสอบในคลัง" : "เพิ่มข้อสอบเข้าคลัง"}</DialogTitle>
            <DialogDescription>ข้อสอบปรนัย เลือกคำตอบที่ถูกต้อง 1 ข้อ</DialogDescription>
          </DialogHeader>

          <FormField label="โจทย์คำถาม" htmlFor="bank-q-text">
            <Textarea id="bank-q-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์โจทย์คำถาม…" />
          </FormField>

          <div className="grid gap-2">
            <Label>ตัวเลือก {hint("เลือกวงกลมเพื่อกำหนดคำตอบที่ถูกต้อง")}</Label>
            <RadioGroup value={answer} onValueChange={setAnswer} className="gap-2">
              {choices.map((c, i) => {
                const letter = String.fromCharCode(65 + i)
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <RadioGroupItem value={c.id} aria-label={`เลือกตัวเลือก ${letter} เป็นคำตอบที่ถูกต้อง`} />
                    <Input aria-label={"ตัวเลือก " + letter} value={c.text} onChange={(e) => setC(c.id, e.target.value)} placeholder={"ตัวเลือก " + letter} />
                    {choices.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={"ลบตัวเลือก " + letter} onClick={() => removeC(c.id)}>
                        <Trash2Icon />
                      </Button>
                    )}
                  </div>
                )
              })}
            </RadioGroup>
            <Button type="button" variant="ghost" size="sm" className="w-fit text-primary" onClick={addC}>
              <PlusIcon />
              เพิ่มตัวเลือก
            </Button>
          </div>

          <FormField label={<>คำอธิบายเฉลย {hint("นักศึกษาเห็นหลังส่งชุดข้อสอบเท่านั้น")}</>} htmlFor="bank-q-explanation">
            <Textarea id="bank-q-explanation" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="อธิบายว่าทำไมข้อนี้ถึงเป็นคำตอบที่ถูก…" />
          </FormField>

          <FormField label={<>หัวข้อ {hint("พิมพ์เองหรือเลือกจากหัวข้อที่ใช้แล้วในบทนี้ (เว้นว่างได้)")}</>} htmlFor="bank-q-topic">
            <Input id="bank-q-topic" list="tutor-topics" value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="เช่น ภาวะหัวใจล้มเหลว" />
            <datalist id="tutor-topics">
              {topics.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving}>
              <CheckIcon />
              บันทึกข้อสอบ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
