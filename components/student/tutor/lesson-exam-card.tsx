import Link from "next/link"
import { PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { TutorLessonData } from "./types"

/** "ทำข้อสอบบทนี้" panel of a tutor lesson: attempt rule plus the result / start buttons. */
export function LessonExamCard({ lesson }: { lesson: TutorLessonData }) {
  const base = "/s/tutor/lesson/" + lesson.id
  return (
    <Card className="mb-4">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold">ทำข้อสอบบทนี้</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lesson.attemptLimit === 1
              ? (lesson.canStart ? "ทำได้ครั้งเดียว เมื่อกดเริ่มแล้วนับเป็น 1 ครั้งแม้ยังไม่ส่ง" : "ทำได้ครั้งเดียว และคุณทำไปแล้ว")
              : "สุ่มชุดข้อใหม่ทุกรอบ ทำซ้ำได้ไม่จำกัด"}
            {lesson.timeLimit != null && ` · เวลา ${lesson.timeLimit} นาทีต่อรอบ`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="secondary">
            <Link href={base + "/result"}>ดูผลของฉัน</Link>
          </Button>
          {lesson.canStart ? (
            <Button asChild>
              <Link href={base + "/exam"}>
                <PlayIcon />
                ทำข้อสอบ
              </Link>
            </Button>
          ) : (
            <Button disabled>ทำไปแล้ว</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
