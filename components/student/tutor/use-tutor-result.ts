"use client"

import { useCallback, useEffect, useState } from "react"
import type { TutorLessonInfo } from "./exam-types"
import type { ResultViewState, TutorResultResponse } from "./result-types"

// Data from /api/tutor/lessons/<id>/result: the best attempt of the student by default, or ?attempt=<id> (also picked
// from the rounds list). Everything shown was computed by the server when the round ended; the page only draws it.
// ?attempt= is read from window.location once on load (no useSearchParams, so the page needs no Suspense boundary).
const resultUrl = (id: string, attemptId: string | null) =>
  "/api/tutor/lessons/" + encodeURIComponent(id) + "/result" + (attemptId ? "?attempt=" + encodeURIComponent(attemptId) : "")

export function useTutorResult(id: string | undefined) {
  const [info, setInfo] = useState<TutorLessonInfo | null>(null) // { set, lesson } for the title
  const [data, setData] = useState<TutorResultResponse | null>(null) // the result payload
  const [view, setView] = useState<ResultViewState>("loading")
  const [switching, setSwitching] = useState(false)

  const load = useCallback(
    async (attemptId: string | null) => {
      if (!id) return
      setSwitching(true)
      try {
        const r = await fetch(resultUrl(id, attemptId), { cache: "no-store" })
        const d = (await r.json().catch(() => ({}))) as Partial<TutorResultResponse> & { state?: string }
        if (r.ok) { setData(d as TutorResultResponse); setView("ok") }
        else if (r.status === 409 && d.state === "none") setView("none")
        else if (r.status === 409 && d.state === "in_progress") setView("running")
        else setView("missing")
      } catch {
        setView("missing")
      } finally {
        setSwitching(false)
      }
    },
    [id],
  )

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch("/api/tutor/lessons/" + encodeURIComponent(id), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: TutorLessonInfo) => { if (!cancelled) setInfo(d) })
      .catch(() => { if (!cancelled) setView("missing") })
    const t = setTimeout(() => load(new URLSearchParams(window.location.search).get("attempt")), 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [id, load])

  return { info, data, view, switching, load }
}
