import type { ReactNode } from "react"
import { CalendarIcon, ClockIcon, StarIcon } from "lucide-react"
import { StatusBadge } from "@/components/common/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/** "Time left" text and its colour class for an assignment due date (`due` = yyyy-mm-dd, `dueTime` = HH:mm). */
function timeRemaining(due: string | null, dueTime: string | null, status: string) {
  if (!due) return { text: "ไม่ระบุ", tone: "text-muted-foreground" }
  if (status === "submitted" || status === "graded") return { text: "ส่งงานเรียบร้อยแล้ว", tone: "text-success" }
  const diffMs = new Date(`${due}T${dueTime || "23:59"}:00`).getTime() - Date.now()
  if (diffMs <= 0) return { text: "เกินกำหนดส่งแล้ว", tone: "text-destructive" }
  const days = Math.floor(diffMs / 86_400_000)
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000)
  const mins = Math.floor((diffMs % 3_600_000) / 60_000)
  if (days > 0) return { text: `${days} วัน ${hours} ชั่วโมง`, tone: "text-success" }
  if (hours > 0) return { text: `${hours} ชั่วโมง ${mins} นาที`, tone: "text-warning" }
  return { text: `${mins} นาที`, tone: "text-destructive" }
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </span>
      {children}
    </div>
  )
}

export function StatusCard({
  status,
  due,
  dueShort,
  dueTime,
  points,
  score,
}: {
  status: string
  due: string | null
  dueShort: string | null
  dueTime: string | null
  points: number | null
  score: number | null | undefined
}) {
  const left = timeRemaining(due, dueTime, status)
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold">สถานะการส่ง</div>
          <StatusBadge status={status} />
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <Row icon={<CalendarIcon />} label="กำหนดส่ง">
            <span className="font-semibold">{dueShort || due}</span>
          </Row>
          <Row icon={<StarIcon />} label="คะแนนเต็ม">
            <span className="font-semibold">{points}</span>
          </Row>
          <Row icon={<ClockIcon />} label="เหลือเวลา">
            <span className={cn("font-semibold", left.tone)}>{left.text}</span>
          </Row>
        </div>
        {status === "graded" && (
          <>
            <Separator className="my-4" />
            <div className="text-center">
              <div className="mb-1 text-xs text-muted-foreground">คะแนนที่ได้</div>
              <div className="text-3xl font-bold text-success tabular-nums">
                {score}
                <span className="text-base font-medium text-muted-foreground">/{points}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
