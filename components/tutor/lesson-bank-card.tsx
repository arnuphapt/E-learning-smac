"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckIcon, ClipboardListIcon, TriangleAlertIcon } from "lucide-react"
import { bankWarning, parseDrawCount } from "@/lib/tutor-bank"
import { parseTimeLimit, roundMinutes, TIME_LIMIT_MAX } from "@/lib/tutor-attempt"
import { roundSize } from "@/lib/tutor-draw"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { SaveTutorLesson, TutorLessonItem } from "./lesson-types"

/** Question bank of one lesson: size, draw count per round (with the "bank too small" warning), time limit, attempts. */
export function LessonBankCard({ lesson, bank, save }: { lesson: TutorLessonItem; bank: { count: number; topics: number }; save: SaveTutorLesson }) {
  const router = useRouter()
  const [whole, setWhole] = useState(lesson.tutor_draw_count == null)
  const [drawInput, setDrawInput] = useState(lesson.tutor_draw_count == null ? "" : String(lesson.tutor_draw_count))
  const [timeInput, setTimeInput] = useState(lesson.tutor_time_limit_minutes == null ? "" : String(lesson.tutor_time_limit_minutes))

  const draft = whole ? null : parseDrawCount(drawInput)
  const warning = bankWarning(bank.count, draft ?? null)
  const defaultMinutes = roundMinutes(roundSize(bank.count, whole ? null : draft ?? lesson.tutor_draw_count ?? null)) // today's rule: 1 minute per drawn question
  const once = lesson.tutor_max_attempts === 1 // NULL = unlimited; stored as an integer so "N times" needs no schema change

  const saveDraw = async () => {
    const value = whole ? null : parseDrawCount(drawInput)
    // unchecking "ใช้ทั้งคลัง" needs a real number: blank/invalid must not silently save NULL (= whole bank)
    if (!whole && !value) {
      toast.error("กรุณากรอกจำนวนข้อต่อรอบเป็นเลขจำนวนเต็มมากกว่า 0 หรือเลือก “ใช้ทั้งคลัง”")
      return
    }
    if (await save({ tutor_draw_count: value })) toast.success("บันทึกจำนวนข้อต่อรอบแล้ว")
  }

  const saveTime = async () => {
    const value = parseTimeLimit(timeInput)
    if (value === undefined) {
      toast.error(`เวลาต่อรอบต้องเป็นเลขจำนวนเต็ม 1 ถึง ${TIME_LIMIT_MAX} นาที หรือเว้นว่างเพื่อใช้ค่าเริ่มต้น`)
      return
    }
    if (await save({ tutor_time_limit_minutes: value })) toast.success(value == null ? "ใช้เวลาค่าเริ่มต้นแล้ว" : "บันทึกเวลาต่อรอบแล้ว")
  }

  const saveAttempts = async (value: number | null) => {
    if (await save({ tutor_max_attempts: value })) toast.success(value === 1 ? "ตั้งเป็นทำได้ครั้งเดียวแล้ว" : "ตั้งเป็นทำซ้ำได้แล้ว")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>คลังข้อสอบของบทนี้</CardTitle>
        <CardDescription>ทุกรอบที่นักศึกษาทำ ระบบสุ่มข้อจากคลังนี้ จับเวลา 1 นาทีต่อข้อ</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xl font-bold tabular-nums">
            {bank.count} <span className="text-sm font-medium text-muted-foreground">ข้อ · {bank.topics} หัวข้อ</span>
          </div>
          <Button onClick={() => router.push("/i/lesson/" + lesson.id + "/bank")}>
            <ClipboardListIcon />
            เปิดคลังข้อสอบ
          </Button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tw-draw">จำนวนข้อต่อรอบ</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="tw-whole" className="cursor-pointer font-normal">
              <Checkbox id="tw-whole" checked={whole} onCheckedChange={(v) => setWhole(v === true)} />
              ใช้ทั้งคลัง
            </Label>
            <Input id="tw-draw" className="w-28" inputMode="numeric" value={drawInput} disabled={whole} onChange={(e) => setDrawInput(e.target.value.replace(/[^0-9]/g, ""))} placeholder="เช่น 20" />
            <Button variant="outline" size="sm" onClick={saveDraw}>
              <CheckIcon />
              บันทึกจำนวนข้อ
            </Button>
          </div>
          {warning && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>คลังไม่พอ: {warning}</span>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tw-time">เวลาต่อรอบ (นาที)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input id="tw-time" className="w-28" inputMode="numeric" value={timeInput} onChange={(e) => setTimeInput(e.target.value.replace(/[^0-9]/g, ""))} placeholder={`ค่าเริ่มต้น: ${defaultMinutes} นาที`} />
            <Button variant="outline" size="sm" onClick={saveTime}>
              <CheckIcon />
              บันทึกเวลา
            </Button>
            <span className="text-xs text-muted-foreground">
              เว้นว่าง = 1 นาทีต่อข้อ ({defaultMinutes} นาที) · นับรวมทั้งรอบ ไม่เกิน {TIME_LIMIT_MAX} นาที
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label id="tw-attempts-label">จำนวนครั้งที่นักศึกษาทำได้</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby="tw-attempts-label"
            value={once ? "once" : "repeat"}
            onValueChange={(v) => {
              if (v === "repeat" && once) saveAttempts(null)
              if (v === "once" && !once) saveAttempts(1)
            }}
          >
            <ToggleGroupItem value="repeat">ทำซ้ำได้</ToggleGroupItem>
            <ToggleGroupItem value="once">ทำได้ครั้งเดียว</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            {once ? "นับทุกรอบที่เริ่มทำ แม้ยังไม่ส่งหรือหมดเวลา เมื่อทำครบแล้วนักศึกษาเริ่มรอบใหม่ไม่ได้" : "นักศึกษาเริ่มรอบใหม่ได้ไม่จำกัด"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
