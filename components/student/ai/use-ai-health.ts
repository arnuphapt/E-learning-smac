"use client"

import { useCallback, useEffect, useState } from "react"
import type { AiStatus } from "./types"

/** Pings /api/ai/health on mount and on demand. */
export function useAiHealth() {
  const [status, setStatus] = useState<AiStatus>("checking")
  const [reason, setReason] = useState("")

  const run = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/health")
      if (res.ok) {
        const data = (await res.json()) as { status: AiStatus; reason?: string }
        setStatus(data.status)
        setReason(data.reason || "")
      } else {
        setStatus("offline")
        setReason("HTTP request failed")
      }
    } catch (e: unknown) {
      setStatus("offline")
      setReason(e instanceof Error ? e.message : String(e))
    }
  }, [])

  // The state starts as "checking", so the first run needs no reset.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; the state is set once the response arrives
    run()
  }, [run])

  const check = () => {
    setStatus("checking")
    run()
  }

  return { status, reason, check }
}
