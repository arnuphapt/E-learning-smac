import Link from "next/link"
import { ClipboardListIcon, LockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Lesson locked until the pre-test is done (or locked for good once its due date passed). `video` = dark panel in the video slot, `page` = centred card. */
export function LockedNotice({
  variant,
  lessonId,
  pastDue,
  dueText,
  preCount,
}: {
  variant: "video" | "page"
  lessonId: string
  pastDue: boolean
  dueText: string
  preCount: number
}) {
  const video = variant === "video"
  const body = (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <div className={cn("grid size-16 place-items-center rounded-2xl", video ? "bg-white/10" : "bg-primary-soft text-primary-soft-foreground")}>
        <LockIcon className="size-7" />
      </div>
      <h2 className="text-lg font-bold">บทเรียนนี้ถูกล็อกไว้</h2>
      {pastDue ? (
        <>
          <p className={cn("text-sm font-semibold text-pretty", video ? "text-red-400" : "text-destructive")}>
            แบบทดสอบก่อนเรียนเลยกำหนดเวลาส่งแล้วเมื่อ {dueText}{" "}
            {video ? "คุณจึงไม่สามารถเข้าทำแบบทดสอบหรือรับชมบทเรียนนี้ได้" : "คุณจึงไม่สามารถเข้าทำแบบทดสอบหรือเข้าสู่บทเรียนนี้ได้"}
          </p>
          <Button size="lg" variant="secondary" disabled>
            <LockIcon />
            เลยกำหนดเวลาทำข้อสอบแล้ว
          </Button>
        </>
      ) : (
        <>
          <p className={cn("text-sm text-pretty", video ? "text-zinc-400" : "text-muted-foreground")}>
            {video
              ? "กรุณาทำแบบทดสอบก่อนเรียน (Pre-test) ให้เสร็จก่อน จึงจะสามารถเข้าชมวิดีโอและเนื้อหาบทเรียนได้"
              : "กรุณาทำแบบทดสอบก่อนเรียน (Pre-test) ให้เสร็จก่อน จึงจะสามารถเข้าเรียนและดูเนื้อหาบทเรียนได้"}
          </p>
          <Button asChild size="lg" variant={video ? "secondary" : "default"}>
            <Link href={"/s/test/" + lessonId + "/pre"}>
              <ClipboardListIcon />
              เริ่มทำ Pre-test ({preCount} ข้อ)
            </Link>
          </Button>
        </>
      )}
    </div>
  )

  if (video) return <div className="grid min-h-72 place-items-center overflow-hidden rounded-xl bg-zinc-950 p-6 text-white sm:aspect-video">{body}</div>
  return (
    <Card className="mx-auto mt-6 max-w-xl">
      <CardContent className="py-6">{body}</CardContent>
    </Card>
  )
}
