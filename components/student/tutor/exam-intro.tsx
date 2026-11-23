import Link from "next/link"
import { PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExamAlert } from "./exam-alert"
import type { AttemptPreview, TutorLessonInfo } from "./exam-types"

/** Pre-start screen: question count and time before the clock starts. */
export function ExamIntro({ info, pre, notice, busy, onStart }: { info: TutorLessonInfo; pre: AttemptPreview; notice: string; busy: boolean; onStart: () => void }) {
  const { set, lesson } = info
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <Badge>{set.code}</Badge>
          <Badge variant="outline" className="text-muted-foreground">ชุดติว</Badge>
        </div>
        <h1 className="text-xl font-bold">{lesson.title}</h1>
        <p className="mb-4 text-sm text-muted-foreground">บทที่ {lesson.index}</p>
        {notice && <ExamAlert tone="warning" className="mb-4">{notice}</ExamAlert>}
        {pre.count === 0 ? (
          <p className="mb-2 text-sm text-muted-foreground">บทนี้ยังไม่มีข้อสอบ</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="min-w-32 flex-1 rounded-xl bg-muted p-3.5 text-center">
                <div className="text-xs text-muted-foreground">จำนวนข้อ</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{pre.count} ข้อ</div>
              </div>
              <div className="min-w-32 flex-1 rounded-xl bg-muted p-3.5 text-center">
                <div className="text-xs text-muted-foreground">เวลาทั้งหมด</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{pre.minutes} นาที</div>
              </div>
            </div>
            {pre.limit === 1 && pre.canStart && (
              <ExamAlert tone="warning" className="mb-4">บทนี้ทำได้ครั้งเดียว เมื่อกดเริ่มแล้วนับเป็น 1 ครั้งแม้ยังไม่ส่งคำตอบ</ExamAlert>
            )}
            <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>{lesson.timeLimit != null ? `เวลา ${pre.minutes} นาทีต่อรอบ` : "เวลา 1 นาทีต่อข้อ"} นับรวมทั้งชุดเป็นนาฬิกาเดียว</li>
              <li>นาฬิกาเริ่มเมื่อคุณกดเริ่ม และเดินต่อแม้ปิดหน้าจอหรือเน็ตหลุด</li>
              <li>ชุดข้อสุ่มใหม่ทุกรอบ ถ้ากลับเข้ามาระหว่างทำจะได้รอบเดิมต่อ</li>
            </ul>
            {pre.canStart ? (
              <Button size="lg" className="w-full" disabled={busy} onClick={onStart}>
                <PlayIcon />
                {busy ? "กำลังเริ่ม..." : "เริ่มทำข้อสอบ"}
              </Button>
            ) : (
              <>
                <Button size="lg" className="w-full" disabled>ทำไปแล้ว</Button>
                <p className="mt-2 text-center text-sm text-muted-foreground">บทนี้ทำได้ครั้งเดียว และทำไปแล้ว</p>
                <Button asChild variant="secondary" className="mt-3 w-full">
                  <Link href={"/s/tutor/lesson/" + lesson.id + "/result"}>ดูผลของฉัน</Link>
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
