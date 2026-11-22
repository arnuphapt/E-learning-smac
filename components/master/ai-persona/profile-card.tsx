"use client"

import { SparklesIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export type AiStatus = "checking" | "online" | "offline" | "degraded"

const STATUS_VIEW: Record<Exclude<AiStatus, "checking">, { label: string; dot: string; badge: string }> = {
  online: { label: "ออนไลน์", dot: "bg-success", badge: "bg-success-soft text-success" },
  degraded: { label: "บริการขัดข้อง", dot: "bg-warning", badge: "bg-warning-soft text-warning" },
  offline: { label: "ออฟไลน์", dot: "bg-destructive", badge: "bg-destructive/10 text-destructive" },
}

function StatusButton({ status, reason, onRecheck }: { status: AiStatus; reason: string; onRecheck: () => void }) {
  const view = status === "checking" ? null : STATUS_VIEW[status]
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onRecheck}
      title={reason ? `คลิกเพื่อตรวจสอบสถานะใหม่ (เหตุผล: ${reason})` : "คลิกเพื่อตรวจสอบสถานะใหม่"}
      aria-label="ตรวจสอบสถานะ AI ใหม่"
      className={cn("h-6 gap-1.5 rounded-full px-2 text-xs font-semibold", view?.badge ?? "bg-muted text-muted-foreground")}
    >
      {view ? (
        <>
          <span aria-hidden className={cn("size-1.5 rounded-full", view.dot, status === "online" && "animate-pulse")} />
          {view.label}
        </>
      ) : (
        <>
          <Spinner className="size-3" />
          ตรวจสอบ...
        </>
      )}
    </Button>
  )
}

export function ProfileCard({
  model,
  status,
  reason,
  onRecheck,
}: {
  model: string
  status: AiStatus
  reason: string
  onRecheck: () => void
}) {
  const info = [
    ["โมเดลประมวลผล", model || "gemini-3.8-flash"],
    ["ระบบตอบคำถาม", "RAG + คลังบทเรียน"],
    ["การรองรับไฟล์", "PDF, รูปภาพ, ข้อความ"],
  ]
  return (
    <Card className="w-full shrink-0 lg:w-75">
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between border-b pb-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <SparklesIcon className="size-3.5" />
            โปรไฟล์ผู้ช่วย AI
          </div>
          <StatusButton status={status} reason={reason} onRecheck={onRecheck} />
        </div>
        <Avatar className="size-28 border-2 border-primary">
          <AvatarFallback className="bg-primary-soft text-primary">
            <SparklesIcon className="size-12" />
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <div className="text-lg font-bold">ยูริจัง</div>
          <Badge variant="secondary" className="mt-1 bg-primary-soft text-primary">
            ผู้ช่วยสอนประจำรายวิชา
          </Badge>
        </div>
        <p className="w-full rounded-xl bg-muted p-3 text-center text-sm italic leading-normal text-muted-foreground">
          “ขี้เล่น มีอารมณ์ขัน แต่งานเป๊ะ พร้อมสนับสนุนการเรียนรู้ของนักศึกษาตลอด 24 ชั่วโมง”
        </p>
        <dl className="flex w-full flex-col gap-2.5 border-t pt-4 text-sm">
          {info.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
