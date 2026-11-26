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
          <div className="flex flex-wrap items-center gap-3">
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
              <ToggleGroupItem
                value="draft"
                className="gap-2 data-[state=on]:border-primary/40 data-[state=on]:bg-primary-soft/60 data-[state=on]:font-semibold data-[state=on]:text-primary-soft-foreground"
              >
                <span aria-hidden className="size-2 rounded-full bg-muted-foreground/60" />
                ฉบับร่าง
              </ToggleGroupItem>
              <ToggleGroupItem
                value="active"
                className="gap-2 data-[state=on]:border-primary/40 data-[state=on]:bg-primary-soft/60 data-[state=on]:font-semibold data-[state=on]:text-primary-soft-foreground"
              >
                <span aria-hidden className="size-2 rounded-full bg-success" />
                เผยแพร่
              </ToggleGroupItem>
            </ToggleGroup>
            <span className="text-xs text-muted-foreground">
              {status === "active" ? "เผยแพร่แล้ว — นักศึกษาจะมองเห็นบทเรียนนี้ทันที" : "ฉบับร่าง — มองเห็นเฉพาะอาจารย์ผู้สอน"}
            </span>
          </div>
        </div>
      </section>

      <Separator />

      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">บทเรียนนี้มีอะไรบ้าง</h3>
          <p className="text-xs text-muted-foreground">เลือกองค์ประกอบที่ต้องการใช้งานในบทเรียนนี้ แท็บจัดการด้านบนจะปรับตามทันที</p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {tiles.map((tile) => (
            <Label
              key={tile.key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 font-normal transition-colors",
                tile.checked
                  ? "border-primary/60 bg-primary-soft/35 shadow-xs"
                  : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/30",
              )}
            >
              <Checkbox
                checked={tile.checked}
                onCheckedChange={(v) => handleTileToggle(tile.key, Boolean(v))}
                className="mt-1"
              />
              <div
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  tile.checked ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {tile.icon}
              </div>
              <div className="grid min-w-0 gap-0.5">
                <span className="text-sm font-medium text-foreground">{tile.label}</span>
                <span className="text-xs text-muted-foreground">{tile.hint}</span>
              </div>
            </Label>
          ))}
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/25 px-4">
          <SwitchRow
            label="ให้ AI ช่วยสรุปและติว"
            on={lesson ? (lesson.allow_ai ?? true) : draft.allow_ai}
            onChange={(val) => {
              onDraftChange({ allow_ai: val })
              if (lesson) void onSave({ allow_ai: val }, true)
            }}
          />
        </div>
      </section>

      <Separator />

      <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="grid gap-2">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/35">
          <span>ตั้งค่าเพิ่มเติม</span>
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", moreOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="rounded-xl border border-border/80 bg-muted/25 px-4">
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
