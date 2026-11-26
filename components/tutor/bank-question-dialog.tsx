"use client"

import { useState } from "react"
import { CheckIcon, ClipboardListIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { uniqueChoiceId } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { ComboboxInput } from "@/components/common/combobox-input"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
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

  const readinessHint = !text.trim()
    ? "กรุณาพิมพ์โจทย์คำถาม"
    : choices.some((c) => !c.text.trim())
      ? "กรุณากรอกตัวเลือกให้ครบทุกข้อ"
      : !choices.some((c) => c.id === answer)
        ? "กรุณาเลือกคำตอบที่ถูกต้อง"
        : null

  const submit = async () => {
    if (saving) return
    if (!text.trim()) return toast.error("กรุณาพิมพ์โจทย์คำถาม")
    if (choices.some((c) => !c.text.trim())) return toast.error("กรุณากรอกตัวเลือกให้ครบทุกข้อ")
    if (!choices.some((c) => c.id === answer)) return toast.error("กรุณาเลือกคำตอบที่ถูกต้อง")
    setSaving(true)
    try {
      await onSave({ ...q, text: text.trim(), choices, answer, explanation: explanation.trim(), topicName })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <DialogHeader className="shrink-0 border-b border-border/80 bg-card px-6 py-4 pr-14 text-left">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <ClipboardListIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  {q.id ? "แก้ไขข้อสอบในคลัง" : "เพิ่มข้อสอบเข้าคลัง"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                  ข้อสอบปรนัย เลือกคำตอบที่ถูกต้อง 1 ข้อ พร้อมคำอธิบายเฉลยและหัวข้อ
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="modal-scroll flex-1 space-y-6 overflow-y-auto bg-card px-6 py-5">
            <section className="grid gap-4">
              <FormField label="โจทย์คำถาม" htmlFor="bank-q-text" required>
                <Textarea
                  id="bank-q-text"
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="พิมพ์โจทย์คำถาม…"
                  required
                  aria-required="true"
                  autoFocus
                />
              </FormField>

              <div className="grid gap-2.5">
                <Label>ตัวเลือก {hint("เลือกวงกลมเพื่อกำหนดคำตอบที่ถูกต้อง")}</Label>
                <RadioGroup value={answer} onValueChange={setAnswer} className="gap-2">
                  {choices.map((c, i) => {
                    const letter = String.fromCharCode(65 + i)
                    const isAnswer = answer === c.id
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors",
                          isAnswer ? "border-primary/55 bg-primary-soft/35" : "border-border/80 bg-card",
                        )}
                      >
                        <RadioGroupItem value={c.id} aria-label={`เลือกตัวเลือก ${letter} เป็นคำตอบที่ถูกต้อง`} />
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs font-semibold",
                            isAnswer ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {letter}
                        </span>
                        <Input
                          aria-label={"ตัวเลือก " + letter}
                          value={c.text}
                          onChange={(e) => setC(c.id, e.target.value)}
                          placeholder={"ตัวเลือก " + letter}
                        />
                        {choices.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive hover:text-destructive"
                            aria-label={"ลบตัวเลือก " + letter}
                            onClick={() => removeC(c.id)}
                          >
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
            </section>

            <Separator />

            <section className="grid gap-4">
              <FormField label={<>คำอธิบายเฉลย {hint("นักศึกษาเห็นหลังส่งชุดข้อสอบเท่านั้น")}</>} htmlFor="bank-q-explanation">
                <Textarea
                  id="bank-q-explanation"
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="อธิบายว่าทำไมข้อนี้ถึงเป็นคำตอบที่ถูก…"
                />
              </FormField>

              <FormField label={<>หัวข้อ {hint("พิมพ์เองหรือเลือกจากหัวข้อที่ใช้แล้วในหมวดนี้ (เว้นว่างได้)")}</>} htmlFor="bank-q-topic">
                <ComboboxInput
                  id="bank-q-topic"
                  value={topicName}
                  onChange={setTopicName}
                  options={topics.map((t) => t.name)}
                  placeholder="เช่น ภาวะหัวใจล้มเหลว"
                  searchPlaceholder="ค้นหาหรือพิมพ์หัวข้อใหม่…"
                  emptyText="ยังไม่มีหัวข้อในหมวดนี้"
                />
              </FormField>
            </section>
          </div>

          <DialogFooter className="shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/35 px-6 py-3.5 sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              {readinessHint ? (
                <span className="text-muted-foreground">{readinessHint}</span>
              ) : (
                <>
                  <span aria-hidden className="size-2 rounded-full bg-success" />
                  <span className="font-medium text-success">พร้อมบันทึกข้อสอบ</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                บันทึกข้อสอบ
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
