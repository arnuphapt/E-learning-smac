"use client"

import { useRef } from "react"
import { fileHref } from "@/lib/files"
import { LockedNotice } from "./locked-notice"
import type { LessonRow } from "./types"

/** The lesson video (reports watch progress as it plays), or the pre-test lock panel in its place. */
export function LessonVideo({
  lesson,
  gated,
  pastDue,
  dueText,
  preCount,
  onProgress,
}: {
  lesson: LessonRow
  gated: boolean
  pastDue: boolean
  dueText: string
  preCount: number
  onProgress: (pct: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  if (gated) return <LockedNotice variant="video" lessonId={lesson.id} pastDue={pastDue} dueText={dueText} preCount={preCount} />

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (v && v.duration > 0) onProgress(Math.floor((v.currentTime / v.duration) * 100))
  }
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} src={fileHref(lesson.video_url) ?? undefined} controls className="block size-full outline-none" onTimeUpdate={handleTimeUpdate} />
    </div>
  )
}
