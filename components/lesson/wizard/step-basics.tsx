"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { ChevronDownIcon, ClipboardCheckIcon, ClipboardListIcon, FileTextIcon, FolderIcon } from "lucide-react"
import { FormField } from "@/components/common/form-field"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SwitchRow } from "@/components/lesson/switch-row"
import type { LessonRow, LessonUpdate } from "@/components/lesson/types"
import { cn } from "@/lib/utils"
import type { BasicsDraft } from "./wizard-types"

export interface StepBasicsHandle {
  flushPending: () => Promise<boolean>
}

/** Step 1: lesson title, description, publish status, optional module tiles and advanced flags. */
export const StepBasics = forwardRef<
  StepBasicsHandle,
  {
    lesson: LessonRow | null
    isTutor: boolean
    draft: BasicsDraft
    onDraftChange: (patch: Partial<BasicsDraft>) => void
    onSave: (fields: LessonUpdate, silent?: boolean) => Promise<void>
    onMarkDirty: () => void
  }
>(function StepBasics({ lesson, isTutor, draft, onDraftChange, onSave, onMarkDirty }, ref) {
  const [titleError, setTitleError] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const title = lesson ? draft.title : draft.title
  const description = draft.description
  const status = lesson ? lesson.status || "draft" : draft.status

  const flushPending = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError("กรุณากรอกชื่อบทเรียน")
      return false
    }
    setTitleError(null)
    if (lesson && (trimmed !== (lesson.title || "") || description !== (lesson.description || ""))) {
      await onSave({ title: trimmed, description }, true)
    }
    return true
  }

  useImperativeHandle(ref, () => ({ flushPending }))

  const handleTileToggle = (key: "has_docs" | "has_pretest" | "has_posttest" | "has_assignment", checked: boolean) => {
    onDraftChange({ [key]: checked })
    if (lesson) {
      void onSave({ [key]: checked }, true)
    }
  }

  type TileItem = {
    key: "has_docs" | "has_pretest" | "has_posttest" | "has_assignment"
    label: string
    hint: string
    icon: React.ReactNode
    checked: boolean
    hide?: boolean
  }

  const allTiles: TileItem[] = [
    {
      key: "has_docs",
      label: "เอกสารประกอบ",
      hint: "ไฟล์ PDF, สไลด์ หรือเอกสารเสริม",
      icon: <FolderIcon className="size-4 text-primary" />,
      checked: lesson ? (lesson.has_docs ?? true) : draft.has_docs,
    },
    {
      key: "has_pretest",
      label: "Pre-test",
      hint: "แบบทดสอบก่อนเริ่มเรียน",
      icon: <ClipboardListIcon className="size-4 text-primary" />,
      checked: lesson ? (lesson.has_pretest ?? true) : draft.has_pretest,
      hide: isTutor,
    },
    {
      key: "has_posttest",
      label: "Post-test",
      hint: "แบบทดสอบหลังเรียนจบ",
      icon: <ClipboardCheckIcon className="size-4 text-primary" />,
      checked: lesson ? (lesson.has_posttest ?? true) : draft.has_posttest,
      hide: isTutor,
    },
    {
      key: "has_assignment",
      label: "ใบงาน",
      hint: "ชิ้นงานและเกณฑ์ให้คะแนน",
      icon: <FileTextIcon className="size-4 text-primary" />,
      checked: lesson ? (lesson.has_assignment ?? true) : draft.has_assignment,
      hide: isTutor,
    },
  ]
  const tiles = allTiles.filter((t) => !t.hide)

  return (
    <div className="grid gap-6">
      <section className="grid gap-4">
        <div>
          <h3 className="text-sm font-semibold">ข้อมูลพื้นฐาน</h3>
          <p className="text-xs text-muted-foreground">กำหนดชื่อ คำอธิบาย และสถานะการเผยแพร่ของบทเรียน</p>
        </div>

        <FormField label="ชื่อบทเรียน" htmlFor="wizard-basics-title" required error={titleError}>
          <Input
            id="wizard-basics-title"
            value={title}
            onChange={(e) => {
              onDraftChange({ title: e.target.value })
              if (titleError) setTitleError(null)
              if (lesson) onMarkDirty()
            }}
            onBlur={() => {
              if (lesson) void flushPending()
            }}
            placeholder="เช่น บทที่ 1 แนวคิดพื้นฐาน"
            autoFocus={!lesson}
          />
        </FormField>

        <FormField label="คำอธิบาย" htmlFor="wizard-basics-desc">
          <Textarea
            id="wizard-basics-desc"
            rows={3}
            value={description}
            onChange={(e) => {
              onDraftChange({ description: e.target.value })
              if (lesson) onMarkDirty()
            }}
            onBlur={() => {
              if (lesson) void flushPending()
            }}
            placeholder="คำอธิบายและหัวข้อในบทเรียนนี้…"
          />
        </FormField>

        <div className="grid gap-2">
          <Label>สถานะบทเรียน</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={status}
            onValueChange={(val) => {
              if (!val) return
              onDraftChange({ status: val })
              if (lesson) void onSave({ status: val }, false)
            }}
          >
            <ToggleGroupItem value="draft">ฉบับร่าง</ToggleGroupItem>
            <ToggleGroupItem value="active">เผยแพร่</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </section>

      <Separator />

      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">บทเรียนนี้มีอะไรบ้าง</h3>
          <p className="text-xs text-muted-foreground">เลือกองค์ประกอบที่ต้องการใช้งานในบทเรียนนี้ ขั้นตอนด้านซ้ายจะปรับตามทันที</p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {tiles.map((tile) => (
            <Label
              key={tile.key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition hover:bg-muted/40",
                tile.checked && "border-primary bg-primary-soft/30",
              )}
            >
              <Checkbox
                checked={tile.checked}
                onCheckedChange={(v) => handleTileToggle(tile.key, Boolean(v))}
                className="mt-0.5"
              />
              <div className="grid min-w-0 gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {tile.icon}
                  {tile.label}
                </span>
                <span className="text-xs text-muted-foreground">{tile.hint}</span>
              </div>
            </Label>
          ))}
        </div>

        <SwitchRow
          label="ให้ AI ช่วยสรุปและติว"
          on={lesson ? (lesson.allow_ai ?? true) : draft.allow_ai}
          onChange={(val) => {
            onDraftChange({ allow_ai: val })
            if (lesson) void onSave({ allow_ai: val }, true)
          }}
        />
      </section>

      <Separator />

      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <span>ตั้งค่าเพิ่มเติม</span>
          <ChevronDownIcon className={cn("size-4 transition-transform", moreOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <SwitchRow
            label="จำกัดการดูวิดีโอ (ต้องดูวิดีโอให้จบก่อนทำขั้นตอนถัดไป)"
            on={lesson ? (lesson.watch_limit ?? false) : draft.watch_limit}
            onChange={(val) => {
              onDraftChange({ watch_limit: val })
              if (lesson) void onSave({ watch_limit: val }, true)
            }}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
})
