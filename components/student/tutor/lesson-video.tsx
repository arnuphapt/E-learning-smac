import { fileHref } from "@/lib/files"
import { VideoPlayer } from "@/components/common/video-player"
import { Card, CardContent } from "@/components/ui/card"

/** Tutor lesson video (R2 via /api/files or external link), or a short note when the lesson has none. */
export function TutorLessonVideo({ src }: { src: string | null }) {
  if (!src) {
    return (
      <Card className="mb-4">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">บทนี้ไม่มีวิดีโอ</CardContent>
      </Card>
    )
  }
  return (
    <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-black">
      <VideoPlayer src={fileHref(src)} className="block size-full outline-none" />
    </div>
  )
}
