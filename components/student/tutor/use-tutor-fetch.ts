"use client"

import { useEffect, useState } from "react"

/** GET a tutor API url once per url; `missing` is true when the request failed (not found / not unlocked for this student). */
export function useTutorFetch<T>(url: string | null) {
  const [state, setState] = useState<{ url: string; data: T | null; failed: boolean } | null>(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: T) => { if (!cancelled) setState({ url, data: d, failed: false }) })
      .catch(() => { if (!cancelled) setState({ url, data: null, failed: true }) })
    return () => { cancelled = true }
  }, [url])

  const current = state && state.url === url ? state : null
  return { data: current?.data ?? null, missing: !!current?.failed }
}
