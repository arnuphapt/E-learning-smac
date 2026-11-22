"use client"

import { useState } from "react"
import { SendIcon, SparklesIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

// "ถาม AI" under one question of the tutor review: a small chat panel on /api/tutor/attempts/<attemptId>/explain.
// The server builds the question context itself (only the question id and the conversation are sent), so this panel
// holds nothing but the wording. The conversation lives in this component only (closing the page drops it; the server
// keeps a log row per answer for the shared daily quota).
const STARTER = "ช่วยอธิบายข้อนี้ให้หน่อย"
const ERRORS: Record<string, string> = {
  rate_limit_exceeded: "ใช้โควตา AI ครบกำหนดแล้ว (15 ครั้ง ในรอบ 5 ชม.) กรุณาลองใหม่ในรอบถัดไป",
  session_token_limit: "บทสนทนายาวเกินไป ปิดแล้วเปิดถาม AI ใหม่อีกครั้ง",
}

export function AskAi({ attemptId, questionId }: { attemptId: string; questionId: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState(STARTER)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    const next: ChatMessage[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setError("")
    setBusy(true)
    try {
      const r = await fetch("/api/tutor/attempts/" + encodeURIComponent(attemptId) + "/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, messages: next }),
      })
      const raw: unknown = await r.json().catch(() => ({}))
      const d = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { reply?: unknown; error?: unknown }) : {}
      const reply = typeof d.reply === "string" ? d.reply : ""
      const errCode = typeof d.error === "string" ? d.error : ""
      if (!r.ok || !reply) {
        setError(ERRORS[errCode] || "AI ตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
        setMessages(messages) // the unanswered question is not part of the conversation
        setInput(text)
        return
      }
      setMessages([...next, { role: "assistant", content: reply }])
    } catch {
      setError("AI ตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
      setMessages(messages)
      setInput(text)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <SparklesIcon className="text-primary" />
        ถาม AI
      </Button>
    )
  }
  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <SparklesIcon className="size-4 text-primary" />
        <b className="flex-1 text-sm">ถาม AI เกี่ยวกับข้อนี้</b>
        <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setOpen(false)} aria-label="ปิด">
          <XIcon />
        </Button>
      </div>
      <div className="mb-3 flex flex-col gap-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
              m.role === "user" ? "self-end bg-primary-soft text-foreground" : "self-start border bg-card text-foreground",
            )}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">AI กำลังตอบ…</div>}
      </div>
      {error && (
        <div className="mb-2 text-xs text-destructive" role="alert">
          {error}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <Input className="min-w-0 flex-1 bg-card" value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder="พิมพ์คำถาม" aria-label="คำถามถึง AI" />
        <Button type="submit" size="sm" disabled={busy || !input.trim()}>
          <SendIcon />
          ส่ง
        </Button>
      </form>
    </div>
  )
}
