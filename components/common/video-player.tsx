"use client"

import { useEffect, useRef, useState } from "react"
import { extractYouTubeId } from "@/lib/files"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export { extractYouTubeId }

interface YTPlayerInstance {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      width?: string | number
      height?: string | number
      videoId: string
      playerVars?: Record<string, string | number>
      events?: {
        onStateChange?: (event: { data: number }) => void
      }
    },
  ) => YTPlayerInstance
  PlayerState: {
    ENDED: number
    PLAYING: number
    PAUSED: number
  }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let ytApiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("YouTube IFrame API requires a browser"))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.()
      if (window.YT) resolve(window.YT)
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
    const tag = existing ?? document.createElement("script")
    const handleError = () => {
      ytApiPromise = null
      tag.remove()
      reject(new Error("Failed to load YouTube IFrame API"))
    }
    tag.addEventListener("error", handleError, { once: true })
    if (!existing) {
      tag.src = "https://www.youtube.com/iframe_api"
      tag.async = true
      document.head.appendChild(tag)
    }
  })
  return ytApiPromise
}

function YouTubeTrackedPlayer({
  videoId,
  className,
  onProgress,
}: {
  videoId: string
  className?: string
  onProgress: (pct: number) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onProgressRef = useRef(onProgress)
  const [loadError, setLoadError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let player: YTPlayerInstance | null = null
    let timer: ReturnType<typeof setInterval> | null = null

    const stopPolling = () => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }

    const reportProgress = () => {
      if (!player) return
      const duration = player.getDuration()
      if (duration > 0) {
        const pct = Math.min(100, Math.max(0, Math.floor((player.getCurrentTime() / duration) * 100)))
        onProgressRef.current(pct)
      }
    }

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return
        setLoadError(false)
        const mountEl = document.createElement("div")
        containerRef.current.replaceChildren(mountEl)
        player = new YT.Player(mountEl, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: { rel: 0 },
          events: {
            onStateChange: (event) => {
              if (cancelled) return
              if (event.data === YT.PlayerState.PLAYING) {
                reportProgress()
                if (timer === null) {
                  timer = setInterval(reportProgress, 1000)
                }
              } else {
                stopPolling()
                if (event.data === YT.PlayerState.ENDED) {
                  onProgressRef.current(100)
                } else if (event.data === YT.PlayerState.PAUSED) {
                  reportProgress()
                }
              }
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
      stopPolling()
      player?.destroy()
      player = null
    }
  }, [videoId, retryCount])

  if (loadError) {
    return (
      <div className={cn(className ?? "block size-full", "grid place-items-center bg-black p-4 text-center text-sm text-white/80")}>
        <div className="grid gap-2">
          <p>โหลดตัวเล่นวิดีโอ YouTube ไม่สำเร็จ</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadError(false)
              setRetryCount((c) => c + 1)
            }}
            className="mx-auto border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            ลองใหม่
          </Button>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} className={cn(className ?? "block size-full", "[&>iframe]:block [&>iframe]:size-full [&>iframe]:border-0")} />
}

/** Shared video player: renders a YouTube embed (with optional IFrame API progress tracking) or `<video>`. */
export function VideoPlayer({
  src,
  className,
  onProgress,
  title = "YouTube video player",
}: {
  src: string | null | undefined
  className?: string
  onProgress?: (pct: number) => void
  title?: string
}) {
  const youtubeId = extractYouTubeId(src)

  if (youtubeId) {
    if (onProgress) {
      return <YouTubeTrackedPlayer videoId={youtubeId} className={className} onProgress={onProgress} />
    }
    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className={cn(className ?? "block size-full", "border-0")}
      />
    )
  }

  return (
    <video
      src={src ?? undefined}
      controls
      className={className ?? "block size-full outline-none"}
      onTimeUpdate={
        onProgress
          ? (e) => {
              const v = e.currentTarget
              if (v.duration > 0) onProgress(Math.floor((v.currentTime / v.duration) * 100))
            }
          : undefined
      }
    />
  )
}
