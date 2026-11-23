"use client"

import { MessageSquareIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AiAvatar } from "@/components/ai/ai-avatar"
import { cn } from "@/lib/utils"
import type { AiStatus, ChatSession, CourseRow, StudentLessonRow } from "./types"

/** Course + lesson pickers, the lesson's chat history, and the assistant status. Shared by the desktop column and the mobile sheet. */
export function AiSidebar({
  courses,
  selectedCourseId,
  onCourseChange,
  lessons,
  selectedLessonId,
  onLessonChange,
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  aiStatus,
  aiStatusReason,
  onCheckHealth,
  emotion,
}: {
  courses: CourseRow[]
  selectedCourseId: string
  onCourseChange: (id: string) => void
  lessons: StudentLessonRow[]
  selectedLessonId: string
  onLessonChange: (id: string) => void
  sessions: ChatSession[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (s: ChatSession) => void
  onDeleteSession: (id: string) => void
  aiStatus: AiStatus
  aiStatusReason: string
  onCheckHealth: () => void
  emotion: string
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/30">
      <div className="flex flex-col gap-3.5 p-3.5">
        <Button type="button" variant="outline" className="justify-start gap-2.5 rounded-full bg-background font-semibold" onClick={onNewChat}>
          <PlusIcon className="text-primary" />
          สนทนาใหม่
        </Button>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-course" className="text-xs font-bold text-muted-foreground">
            รายวิชา
          </Label>
          <Select value={selectedCourseId} onValueChange={onCourseChange}>
            <SelectTrigger id="ai-course" className="w-full bg-background text-[12.5px]">
              <SelectValue placeholder="เลือกรายวิชา" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id ?? ""}>
                  {c.code} - {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-lesson" className="text-xs font-bold text-muted-foreground">
            บทเรียน
          </Label>
          <Select value={selectedLessonId} onValueChange={onLessonChange} disabled={lessons.length === 0}>
            <SelectTrigger id="ai-lesson" className="w-full bg-background text-[12.5px]">
              <SelectValue placeholder="(ไม่มีบทเรียน)" />
            </SelectTrigger>
            <SelectContent>
              {lessons.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  บทที่ {l.index}: {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t px-3.5 pt-2.5 pb-1 text-xs font-bold text-muted-foreground">ล่าสุด</div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 px-2.5 pb-2.5">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">ยังไม่มีประวัติในบทเรียนนี้</p>
          ) : (
            sessions.map((sess) => {
              const isCurrent = sess.id === activeSessionId
              return (
                <div key={sess.id} className={cn("group flex items-center rounded-full pr-1 hover:bg-accent", isCurrent && "bg-accent")}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSelectSession(sess)}
                    aria-current={isCurrent}
                    className={cn("h-9 min-w-0 flex-1 justify-start gap-2 rounded-full px-3 text-[13px] font-normal hover:bg-transparent", isCurrent && "font-semibold")}
                  >
                    <MessageSquareIcon className={cn("size-3.5 shrink-0", !isCurrent && "opacity-60")} />
                    <span className="truncate">{sess.firstQuestion || "บทสนทนาใหม่"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-destructive hover:text-destructive max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                    aria-label="ลบเซสชันนี้"
                    onClick={() => onDeleteSession(sess.id)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between gap-2.5 border-t bg-background px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AiAvatar emotion={aiStatus === "offline" ? "sleeping" : emotion} status={aiStatus} className="size-[34px]" />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold">ยูริจัง</div>
            <div className="truncate text-[11px] text-muted-foreground">Gemini 3.8 Flash</div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={onCheckHealth}
          aria-label="ตรวจสอบสถานะ AI"
          title={aiStatusReason ? `คลิกตรวจสอบสถานะ (${aiStatusReason})` : "คลิกตรวจสอบสถานะ"}
        >
          <RefreshCwIcon className={cn("size-3.5", aiStatus === "checking" && "animate-spin")} />
        </Button>
      </div>
    </div>
  )
}
