import { FileIcon, SparklesIcon } from "lucide-react"
import { fileHref } from "@/lib/files"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/components/student/ai/types"
import { CopyButton } from "./copy-button"
import { MarkdownText } from "./markdown-text"

export function AiSparkle({ className }: { className?: string }) {
  return <SparklesIcon aria-hidden className={cn("size-5 shrink-0 text-primary", className)} />
}

/** User bubble (right, with attachment links) or assistant answer (left, markdown + copy). */
export function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "assistant") {
    return (
      <div className="flex w-full items-start gap-3.5">
        <AiSparkle className="mt-0.5 size-6" />
        <div className="min-w-0 flex-1">
          <MarkdownText text={message.content} />
          <div className="mt-2.5">
            <CopyButton text={message.content} label="คัดลอก" />
          </div>
        </div>
      </div>
    )
  }
  const files = message.attachments ?? []
  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[80%] rounded-[22px] rounded-br-sm border bg-muted px-[18px] py-3 text-[14.5px] leading-relaxed">
        <div className="whitespace-pre-wrap">{message.content}</div>
        {files.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-dashed pt-2">
            {files.map((f, idx) => (
              <a
                key={idx}
                href={fileHref(f.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary underline"
              >
                <FileIcon className="size-3.5 shrink-0" />
                <span className="max-w-60 truncate">{f.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Shown while the answer is on its way. */
export function ChatThinking() {
  return (
    <div role="status" aria-label="กำลังคิด" className="flex items-start gap-3 py-2">
      <AiSparkle className="mt-0.5 size-[22px] animate-pulse" />
      <div className="flex max-w-xs flex-1 flex-col gap-2">
        <div className="h-3 w-[90%] animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-[65%] animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}
