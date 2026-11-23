"use client"

import { useState } from "react"
import { CheckIcon, FileIcon, PaperclipIcon, SendIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import type { LessonDoc } from "@/components/student/ai/types"

/** Question box: attached document chips, auto-growing textarea (Enter sends, Shift+Enter breaks the line), attach picker, send. */
export function ChatComposer({
  input,
  onInputChange,
  onSend,
  disabled,
  lessonDocs,
  attachedFiles,
  onAttachedChange,
}: {
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  /** Loading, quota reached or session too long. */
  disabled: boolean
  lessonDocs: LessonDoc[]
  attachedFiles: LessonDoc[]
  onAttachedChange: (files: LessonDoc[]) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const canSend = (input.trim() !== "" || attachedFiles.length > 0) && !disabled

  return (
    <div className="flex flex-col gap-2 rounded-3xl border bg-muted/50 py-2.5 pr-3.5 pl-[18px] shadow-xs">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-dashed pb-1.5">
          {attachedFiles.map((file, idx) => (
            <div key={idx} className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background py-1 pr-1.5 pl-2.5 text-xs font-medium">
              <FileIcon className="size-3 shrink-0 text-primary" />
              <span className="max-w-50 truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-full"
                aria-label={`เอาไฟล์ ${file.name} ออก`}
                onClick={() => onAttachedChange(attachedFiles.filter((_, i) => i !== idx))}
              >
                <XIcon className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        placeholder="พิมพ์ถามคำถามเกี่ยวกับเนื้อหาบทเรียนกับยูริได้ที่นี่..."
        aria-label="คำถามถึงยูริ"
        rows={1}
        disabled={disabled}
        className="max-h-36 min-h-0 resize-none border-0 bg-transparent px-0 py-0.5 text-[14.5px] shadow-none focus-visible:ring-0 dark:bg-transparent"
      />

      <div className="flex items-center justify-between">
        {lessonDocs.length > 0 ? (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" disabled={disabled} aria-label="แนบเอกสารบทเรียน">
                <PaperclipIcon className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="max-h-56 w-80 overflow-y-auto p-2">
              <div className="px-2 py-1 text-xs font-bold text-muted-foreground">แนบเอกสารจากบทเรียน:</div>
              {lessonDocs.map((doc, idx) => {
                const isAttached = attachedFiles.some((f) => f.url === doc.url)
                return (
                  <Button
                    key={idx}
                    type="button"
                    variant="ghost"
                    disabled={isAttached}
                    className="h-auto w-full justify-start gap-2 px-3 py-2 text-left text-[12.5px] font-normal"
                    onClick={() => {
                      onAttachedChange([...attachedFiles, doc])
                      setPickerOpen(false)
                    }}
                  >
                    <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    {isAttached && <CheckIcon className="size-3 text-success" />}
                  </Button>
                )
              })}
            </PopoverContent>
          </Popover>
        ) : (
          <div />
        )}

        <Button type="button" size="icon" className="size-9 rounded-full" onClick={onSend} disabled={!canSend} aria-label="ส่งคำถาม">
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
