"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { CircleXIcon, SparklesIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ChatMessage, LessonDoc, RateLimitInfo } from "@/components/student/ai/types"
import { ChatBubble, ChatThinking } from "./chat-message"
import { ChatComposer } from "./chat-composer"

/**
 * Conversation feed + question box of one lesson chat. Shows `welcome` while the conversation holds only the greeting.
 * State and API calls live in the caller (student/ai/use-ai-chat).
 */
export function AiChat({
  messages,
  welcome,
  thinking,
  input,
  onInputChange,
  onSend,
  loading,
  rateLimitInfo,
  rateLimitError,
  sessionTokenError,
  onRestart,
  lessonDocs,
  attachedFiles,
  onAttachedChange,
}: {
  messages: ChatMessage[]
  welcome: ReactNode
  /** Show the "thinking" placeholder (a summary request has its own indicator in the top bar). */
  thinking: boolean
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  loading: boolean
  rateLimitInfo: RateLimitInfo | null
  rateLimitError: boolean
  sessionTokenError: boolean
  onRestart: () => void
  lessonDocs: LessonDoc[]
  attachedFiles: LessonDoc[]
  onAttachedChange: (files: LessonDoc[]) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col px-5 py-6">
          {messages.length <= 1 ? (
            <div className="m-auto w-full max-w-3xl px-2 py-5">{welcome}</div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-4">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
              {thinking && <ChatThinking />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 pb-3.5">
        {rateLimitError && (
          <Alert variant="destructive" className="mb-2 rounded-2xl py-2.5 text-[12.5px] font-medium">
            <CircleXIcon />
            <AlertDescription>
              โควต้าการถามรอบนี้เต็มแล้ว ({rateLimitInfo?.used}/{rateLimitInfo?.limit} คำถาม) ระบบจะทยอยรีเซ็ตตามรอบเวลา 5 ชั่วโมง
            </AlertDescription>
          </Alert>
        )}

        {sessionTokenError && (
          <Alert className="mb-2 flex items-center gap-2 rounded-2xl border-warning/40 bg-warning-soft py-2.5 text-[12.5px] font-medium text-warning">
            <SparklesIcon className="size-4 shrink-0" />
            <span className="flex-1">เซสชันนี้คุยเยอะเกินขีดจำกัดแล้ว กรุณาเริ่มการสนทนาใหม่เพื่อพูดคุยต่อ</span>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={onRestart}>
              เริ่มใหม่
            </Button>
          </Alert>
        )}

        <ChatComposer
          input={input}
          onInputChange={onInputChange}
          onSend={onSend}
          disabled={loading || rateLimitError || sessionTokenError}
          lessonDocs={lessonDocs}
          attachedFiles={attachedFiles}
          onAttachedChange={onAttachedChange}
        />

        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-muted-foreground">
          <span>ยูริอาจให้ข้อมูลคลาดเคลื่อนได้ กรุณาตรวจสอบกับเนื้อหาบทเรียน</span>
          {rateLimitInfo && (
            <span>
              โควต้า (รอบ 5 ชม.): {rateLimitInfo.used}/{rateLimitInfo.limit} คำถาม
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
