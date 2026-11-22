"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, PlusIcon, TargetIcon, Trash2Icon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Json } from "@/lib/database.types"
import { FormField } from "@/components/common/form-field"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useDeleteAssignment } from "./assignment-actions"
import { errMsg, getTodayStr, maskTime, parseCriteria, type AssignmentRow, type LessonRow, type RubricCriterion, type RubricRow } from "./types"

function OptionCheck({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Label htmlFor={id} className="cursor-pointer gap-2 rounded-lg border px-3 py-2 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-soft has-data-[state=checked]:font-semibold">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </Label>
  )
}

/** Create/edit an assignment with its rubric. Mount only while open so the form resets. */
export function AssignmentSheet({
  lesson,
  assignment,
  rubric,
  onClose,
  onSaved,
}: {
  lesson: LessonRow
  /** null = new assignment. */
  assignment: AssignmentRow | null
  rubric: RubricRow | null | undefined
  onClose: () => void
  /** Called after a save or delete so the parent reloads. */
  onSaved: () => void
}) {
  const deleteAssignment = useDeleteAssignment()
  const a: Partial<AssignmentRow> = assignment || { title: "", instructions: "", due: "", due_time: "23:59", allow_late: false, points: 10, allow_file: true, allow_text: true }

  const [title, setTitle] = useState(a.title || "")
  const [instructions, setInstructions] = useState(a.instructions || "")
  const [due, setDue] = useState(a.due || getTodayStr())
  const [dueTime, setDueTime] = useState(a.due_time || "23:59")
  const [allowLate, setAllowLate] = useState(a.allow_late ?? false)
  const [allowFile, setAllowFile] = useState(a.allow_file ?? true)
  const [allowText, setAllowText] = useState(a.allow_text ?? true)
  const [criteria, setCriteria] = useState<RubricCriterion[]>(parseCriteria(rubric?.criteria))
  const total = criteria.reduce((s, c) => s + c.max, 0)

  const patchCriterion = (id: string, p: Partial<RubricCriterion>) => setCriteria((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)))

  const handleSave = async () => {
    const asgObj = { title, instructions, due, due_time: dueTime, allow_late: allowLate, points: total, allow_file: allowFile, allow_text: allowText, lesson_id: lesson.id, course_id: lesson.course_id }

    let error: { message: string } | null = null
    let assignmentId = a.id || ""
    if (a.id) {
      ;({ error } = await supabase.from("assignments").update(asgObj).eq("id", a.id))
    } else {
      assignmentId = "a_" + Date.now()
      ;({ error } = await supabase.from("assignments").insert([{ id: assignmentId, ...asgObj }]))
    }

    if (!error) {
      const criteriaJson = criteria as unknown as Json
      if (rubric?.id) {
        ;({ error } = await supabase.from("rubrics").update({ criteria: criteriaJson }).eq("id", rubric.id))
      } else {
        const rubricId = "r_" + Date.now()
        ;({ error } = await supabase.from("rubrics").insert([{ id: rubricId, title: title + " Rubric", criteria: criteriaJson }]))
        if (!error && !a.id) await supabase.from("assignments").update({ rubric_id: rubricId }).eq("id", assignmentId)
      }
    }

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก: " + errMsg(error))
    } else {
      toast.success("บันทึกใบงานและ Rubric เรียบร้อยแล้ว")
      onSaved()
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!a.id) return
    if (await deleteAssignment({ id: a.id, title, rubric_id: a.rubric_id ?? null })) {
      onSaved()
      onClose()
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{a.id ? "แก้ไขใบงาน" : "เพิ่มใบงานใหม่"}</SheetTitle>
          <SheetDescription>กำหนดรายละเอียดใบงานและเกณฑ์การให้คะแนน (Rubric)</SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-4">
          <Card>
            <CardHeader>
              <CardTitle>รายละเอียดใบงาน</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField label="ชื่อใบงาน" htmlFor="asg-title">
                <Input id="asg-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </FormField>
              <FormField label="คำชี้แจง" htmlFor="asg-instructions">
                <Textarea id="asg-instructions" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="กำหนดส่ง" htmlFor="asg-due-date">
                  <Input id="asg-due-date" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </FormField>
                <FormField label="เวลา" htmlFor="asg-due-time">
                  <Input id="asg-due-time" value={dueTime} onChange={(e) => setDueTime(maskTime(e.target.value))} placeholder="23:59" />
                </FormField>
                <FormField label="คะแนนเต็ม" htmlFor="asg-total-points">
                  <Input id="asg-total-points" value={total} readOnly />
                </FormField>
              </div>
              <div className="grid gap-2">
                <Label>รูปแบบการส่งงาน</Label>
                <div className="flex flex-wrap gap-2">
                  <OptionCheck id="asg-allow-file" label="แนบไฟล์ (PDF/DOCX/รูปภาพ)" checked={allowFile} onChange={setAllowFile} />
                  <OptionCheck id="asg-allow-text" label="พิมพ์ข้อความตอบ" checked={allowText} onChange={setAllowText} />
                  <OptionCheck id="asg-allow-late" label="อนุญาตให้ส่งล่าช้า" checked={allowLate} onChange={setAllowLate} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TargetIcon className="size-4 text-primary" />
                  เกณฑ์การให้คะแนน (Rubric)
                </CardTitle>
                <CardDescription>กำหนดเกณฑ์ย่อยและคะแนนเต็มของแต่ละเกณฑ์</CardDescription>
              </div>
              <ToneBadge tone="primary">รวม {total} คะแนน</ToneBadge>
            </CardHeader>
            <CardContent className="grid gap-2">
              {criteria.map((c, i) => (
                <div key={c.id} className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
                  <div className="grid flex-1 gap-2">
                    <Input aria-label={"ชื่อเกณฑ์ที่ " + (i + 1)} className="font-semibold" value={c.name} onChange={(e) => patchCriterion(c.id, { name: e.target.value })} placeholder={"เกณฑ์ที่ " + (i + 1)} />
                    <Input aria-label={"คำอธิบายเกณฑ์ที่ " + (i + 1)} value={c.desc || ""} onChange={(e) => patchCriterion(c.id, { desc: e.target.value })} placeholder="คำอธิบายเกณฑ์ (ระดับคะแนนเต็ม)" />
                  </div>
                  <div className="grid w-24 shrink-0 gap-1">
                    <Label htmlFor={`crit-max-${c.id}`} className="text-xs text-muted-foreground">
                      คะแนนเต็ม
                    </Label>
                    <Input id={`crit-max-${c.id}`} className="text-center font-bold" value={c.max} onChange={(e) => patchCriterion(c.id, { max: Math.max(0, +e.target.value || 0) })} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="mt-5 text-destructive hover:text-destructive" aria-label="ลบเกณฑ์" onClick={() => setCriteria(criteria.filter((x) => x.id !== c.id))}>
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" className="w-fit text-primary" onClick={() => setCriteria([...criteria, { id: "rc" + Date.now(), name: "", desc: "", max: 5 }])}>
                <PlusIcon />
                เพิ่มเกณฑ์
              </Button>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">นักศึกษาจะเห็นเกณฑ์เหล่านี้ก่อนส่งงาน และเห็นคะแนนรายเกณฑ์เมื่ออาจารย์ตรวจเสร็จ ({criteria.length} เกณฑ์ · คะแนนเต็ม {total})</p>
        </div>
        <SheetFooter className="flex-row justify-between border-t">
          {a.id ? (
            <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2Icon />
              ลบใบงาน
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleSave}>
              <CheckIcon />
              บันทึกใบงาน
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
