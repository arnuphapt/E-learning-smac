"use client"

import { useState } from "react"
import { CheckIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { nextChoiceId } from "@/lib/questions"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { ChoiceItem, QuestionEditorItem } from "./types"

/** Multiple-choice question editor. Mount only while open so the form resets. */
export function QuestionDialog({ q, onClose, onSave }: { q: QuestionEditorItem; onClose: () => void; onSave: (q: QuestionEditorItem) => void }) {
  const [text, setText] = useState(q.text)
  const [choices, setChoices] = useState<ChoiceItem[]>(q.choices || [{ id: "a", text: "" }, { id: "b", text: "" }])
  const [answer, setAnswer] = useState(q.answer || "a")

  const setChoiceText = (id: string, v: string) => setChoices((cs) => cs.map((c) => (c.id === id ? { ...c, text: v } : c)))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ ...q, text, choices, answer })
          }}
        >
          <DialogHeader>
            <DialogTitle>{q.text ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}</DialogTitle>
            <DialogDescription>ข้อสอบปรนัย เลือกคำตอบที่ถูกต้อง 1 ข้อ</DialogDescription>
          </DialogHeader>
          <FormField label="โจทย์คำถาม" htmlFor="q-editor-text">
            <Textarea id="q-editor-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์โจทย์คำถาม…" />
          </FormField>
          <div className="grid gap-2">
            <Label>
              ตัวเลือก <span className="font-normal text-muted-foreground">— เลือกวงกลมเพื่อกำหนดคำตอบที่ถูกต้อง</span>
            </Label>
            <RadioGroup value={answer} onValueChange={setAnswer} className="gap-2">
              {choices.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <RadioGroupItem value={c.id} aria-label={"เลือกตัวเลือก " + c.id.toUpperCase() + " เป็นคำตอบที่ถูกต้อง"} />
                  <Input aria-label={"ตัวเลือก " + c.id.toUpperCase()} value={c.text} onChange={(e) => setChoiceText(c.id, e.target.value)} placeholder={"ตัวเลือก " + c.id.toUpperCase()} />
                  {choices.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={"ลบตัวเลือก " + c.id.toUpperCase()} onClick={() => setChoices(choices.filter((x) => x.id !== c.id))}>
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              ))}
            </RadioGroup>
            <Button type="button" variant="ghost" size="sm" className="w-fit text-primary" onClick={() => setChoices([...choices, { id: nextChoiceId(choices), text: "" }])}>
              <PlusIcon />
              เพิ่มตัวเลือก
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit">
              <CheckIcon />
              บันทึกข้อสอบ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
