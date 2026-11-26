"use client"

import { useState } from "react"
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { QuestionDialog } from "@/components/lesson/question-dialog"
import { SwitchRow } from "@/components/lesson/switch-row"
import { emptyQuestion } from "@/components/lesson/test-actions"
import type { QuestionEditorItem } from "@/components/lesson/types"
import { emptyMaterial, MATERIAL_LABELS, type MaterialKind, type MaterialPayload } from "@/lib/lesson-materials"
import { saveMaterial, type MaterialRow } from "@/lib/lesson-materials-client"

export function MaterialEditor({ kind, row, onClose, onSaved }: {
  kind: MaterialKind
  row?: MaterialRow
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(row?.title ?? "")
  const [payload, setPayload] = useState<MaterialPayload>(() => structuredClone(row ? row.payload as unknown as MaterialPayload : emptyMaterial()))
  const [editing, setEditing] = useState<QuestionEditorItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const patchConfig = (patch: Partial<MaterialPayload["config"]>) => setPayload((p) => ({ ...p, config: { ...p.config, ...patch } }))
  const patchWorksheet = (patch: Partial<MaterialPayload["worksheet"]>) => setPayload((p) => ({ ...p, worksheet: { ...p.worksheet, ...patch } }))

  const save = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await saveMaterial(kind, title, payload, row?.id)
      toast.success("บันทึกต้นแบบแล้ว")
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{row ? "แก้ไข" : "สร้าง"}ต้นแบบ{MATERIAL_LABELS[kind]}</DialogTitle>
          <DialogDescription>เก็บเนื้อหาไว้เลือกใช้ซ้ำในบทเรียน การแก้ไขที่นี่จะไม่เปลี่ยนสำเนาที่นำไปใช้แล้ว</DialogDescription>
        </DialogHeader>
        <fieldset disabled={saving} className="grid min-h-0 gap-5 overflow-y-auto px-1">
          <FormField label="ชื่อต้นแบบ" htmlFor="material-title" required>
            <Input id="material-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น การพยาบาลผู้ป่วยโรคหัวใจ" />
          </FormField>
          {kind === "assignment" ? (
            <>
              <FormField label="คำชี้แจง" htmlFor="material-instructions">
                <Textarea id="material-instructions" rows={4} value={payload.worksheet.instructions} onChange={(e) => patchWorksheet({ instructions: e.target.value })} />
              </FormField>
              <div className="grid gap-2">
                <SwitchRow label="รับการส่งแบบแนบไฟล์" on={payload.worksheet.allow_file} onChange={(v) => patchWorksheet({ allow_file: v })} />
                <SwitchRow label="รับการส่งแบบพิมพ์ข้อความ" on={payload.worksheet.allow_text} onChange={(v) => patchWorksheet({ allow_text: v })} />
                <SwitchRow label="อนุญาตให้ส่งล่าช้า" on={payload.worksheet.allow_late} onChange={(v) => patchWorksheet({ allow_late: v })} />
              </div>
              <section className="grid gap-3">
                <h3 className="font-semibold">เกณฑ์การให้คะแนน · รวม {payload.worksheet.criteria.reduce((sum, c) => sum + c.max, 0)} คะแนน</h3>
                {payload.worksheet.criteria.map((c, i) => (
                  <div key={c.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_100px_auto]">
                    <div className="grid gap-2">
                      <FormField label={`ชื่อเกณฑ์ที่ ${i + 1}`} htmlFor={`material-criterion-${c.id}`}>
                        <Input id={`material-criterion-${c.id}`} value={c.name} onChange={(e) => patchWorksheet({ criteria: payload.worksheet.criteria.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x) })} />
                      </FormField>
                      <FormField label="คำอธิบายเกณฑ์" htmlFor={`material-desc-${c.id}`}>
                        <Input id={`material-desc-${c.id}`} value={c.desc ?? ""} onChange={(e) => patchWorksheet({ criteria: payload.worksheet.criteria.map((x) => x.id === c.id ? { ...x, desc: e.target.value } : x) })} />
                      </FormField>
                    </div>
                    <FormField label="คะแนนเต็ม" htmlFor={`material-max-${c.id}`}>
                      <Input id={`material-max-${c.id}`} type="number" min="1" value={c.max} onChange={(e) => patchWorksheet({ criteria: payload.worksheet.criteria.map((x) => x.id === c.id ? { ...x, max: Number(e.target.value) } : x) })} />
                    </FormField>
                    <Button type="button" variant="ghost" size="icon" aria-label={`ลบเกณฑ์ที่ ${i + 1}`} onClick={() => patchWorksheet({ criteria: payload.worksheet.criteria.filter((x) => x.id !== c.id) })}><Trash2Icon /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-fit" onClick={() => patchWorksheet({ criteria: [...payload.worksheet.criteria, { id: crypto.randomUUID(), name: "", desc: "", max: 5 }] })}><PlusIcon />เพิ่มเกณฑ์</Button>
                <p className="text-sm text-muted-foreground">กำหนดวันส่งตอนเลือกใช้ในบทเรียน</p>
              </section>
            </>
          ) : (
            <>
              <section className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="คะแนนผ่าน (%)" htmlFor="material-passing"><Input id="material-passing" type="number" min="0" max="100" value={payload.config.passing_score} onChange={(e) => patchConfig({ passing_score: Number(e.target.value) })} /></FormField>
                  <FormField label="เวลาทำ (นาที)" htmlFor="material-time"><Input id="material-time" type="number" min="1" value={payload.config.time_limit} onChange={(e) => patchConfig({ time_limit: Number(e.target.value) })} /></FormField>
                  <FormField label="จำนวนครั้งที่ทำได้" htmlFor="material-attempts">
                    <Select value={payload.config.attempts} onValueChange={(v) => patchConfig({ attempts: v })}>
                      <SelectTrigger id="material-attempts" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="1">1 ครั้ง</SelectItem><SelectItem value="2">2 ครั้ง</SelectItem><SelectItem value="unlimited">ไม่จำกัด</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                </div>
                <SwitchRow label="นักศึกษาต้องทำแบบทดสอบนี้" on={payload.config.required} onChange={(v) => patchConfig({ required: v })} />
                <SwitchRow label="สุ่มลำดับคำถาม" on={payload.config.shuffle} onChange={(v) => patchConfig({ shuffle: v })} />
                <SwitchRow label="แสดงเฉลยหลังส่ง" on={payload.config.show_answers} onChange={(v) => patchConfig({ show_answers: v })} />
              </section>
              <section className="grid gap-3 border-t pt-4">
                <h3 className="font-semibold">คำถาม ({payload.questions.length} ข้อ)</h3>
                {payload.questions.length === 0 && <p className="text-sm text-muted-foreground">เพิ่มคำถามและเฉลยเพื่อให้พร้อมเลือกใช้ในบทเรียน</p>}
                <ol className="divide-y">
                  {payload.questions.map((q, i) => (
                    <li key={i} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1 break-words text-sm">{i + 1}. {q.text}</span>
                      <Button type="button" size="icon" variant="ghost" aria-label={`แก้ไขข้อที่ ${i + 1}`} onClick={() => setEditing({ ...structuredClone(q), id: String(i), no: i + 1 })}><PencilIcon /></Button>
                      <Button type="button" size="icon" variant="ghost" aria-label={`ลบข้อที่ ${i + 1}`} onClick={() => setPayload((p) => ({ ...p, questions: p.questions.filter((_, j) => i !== j) }))}><Trash2Icon /></Button>
                    </li>
                  ))}
                </ol>
                <Button type="button" variant="outline" className="w-fit" onClick={() => setEditing(emptyQuestion(payload.questions.length + 1))}><PlusIcon />เพิ่มคำถาม</Button>
              </section>
            </>
          )}
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>ยกเลิก</Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>{saving && <Loader2Icon className="animate-spin" />}บันทึกต้นแบบ</Button>
        </DialogFooter>
        {editing && <QuestionDialog q={editing} onClose={() => setEditing(null)} onSave={(q) => {
          const question = { text: q.text, type: q.type ?? "single", choices: q.choices, answer: q.answer }
          setPayload((p) => ({ ...p, questions: q.id.startsWith("temp_") ? [...p.questions, question] : p.questions.map((x, i) => i === Number(q.id) ? question : x) }))
          setEditing(null)
        }} />}
      </DialogContent>
    </Dialog>
  )
}
