"use client"

import { fileHref } from "@/lib/files"
import { VideoPlayer } from "@/components/common/video-player"
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
  if (gated) return <LockedNotice variant="video" lessonId={lesson.id} pastDue={pastDue} dueText={dueText} preCount={preCount} />

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <VideoPlayer src={fileHref(lesson.video_url)} onProgress={onProgress} className="block size-full outline-none" />
    </div>
  )
}
