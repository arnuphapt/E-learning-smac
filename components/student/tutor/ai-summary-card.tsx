"use client"

import { useEffect, useRef, useState } from "react"
import { SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { TutorSummary } from "./result-types"

interface SummaryState {
  s?: TutorSummary
  loading?: boolean
  busy?: boolean
  failed?: boolean
}

// AI summary (ticket 06). Stored on the attempt: shown straight from the result payload when it exists, otherwise the first
// open asks the server to generate it (POST .../summary, once; the server never calls Gemini again once it is stored).
// A failure leaves the rest of the page as it is; opening the page again retries.
export function AiSummaryCard({ attemptId, initial }: { attemptId: string; initial: TutorSummary | null }) {
  const [state, setState] = useState<SummaryState>(initial ? { s: initial } : { loading: true })
  const started = useRef(false)
  useEffect(() => {
    if (initial || started.current) return
    started.current = true
    fetch("/api/tutor/attempts/" + encodeURIComponent(attemptId) + "/summary", { method: "POST" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { summary?: TutorSummary | null }) => setState(d.summary ? { s: d.summary } : { busy: true }))
      .catch(() => setState({ failed: true }))
  }, [attemptId, initial])

  const s = state.s
  return (
    <Card className="mb-4">
      <CardContent>
        <Badge variant="secondary" className="mb-3">
          <SparklesIcon />
          สรุปจาก AI
        </Badge>
        {state.loading && <p className="text-sm text-muted-foreground">AI กำลังสรุปผลของคุณ…</p>}
        {state.busy && <p className="text-sm text-muted-foreground">AI กำลังสรุปผลอยู่ ลองเปิดหน้านี้ใหม่อีกครั้งในอีกสักครู่</p>}
        {state.failed && <p className="text-sm text-muted-foreground">ยังสรุปด้วย AI ไม่ได้ในตอนนี้ ผลคะแนนและเฉลยด้านล่างใช้ได้ตามปกติ ลองเปิดหน้านี้ใหม่อีกครั้งเพื่อให้ AI สรุปใหม่</p>}
        {s && (
          <>
            <p className="mb-3 text-sm whitespace-pre-line text-pretty">{s.overview}</p>
            {s.topic_notes.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {s.topic_notes.map((n, i) => (
                  <div key={i} className="rounded-xl bg-muted px-3.5 py-2.5 text-sm">
                    <b>{n.topic}</b><span className="text-muted-foreground"> · {n.comment}</span>
                  </div>
                ))}
              </div>
            )}
            {s.next_steps.length > 0 && (
              <div className="rounded-xl bg-muted px-4 py-3.5">
                <div className="mb-1 text-sm font-semibold">ควรทำต่อ</div>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {s.next_steps.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
