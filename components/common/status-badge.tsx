import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusTone = "success" | "info" | "primary" | "warning" | "danger" | "muted" | "outline"

const toneClass: Record<StatusTone, string> = {
  success: "border-transparent bg-success-soft text-success",
  info: "border-transparent bg-info-soft text-info",
  primary: "border-transparent bg-primary-soft text-primary-soft-foreground",
  warning: "border-transparent bg-warning-soft text-warning",
  danger: "border-transparent bg-destructive/10 text-destructive",
  muted: "border-transparent bg-muted text-muted-foreground",
  outline: "text-muted-foreground",
}

// Same map as the old Primitives.jsx StatusBadge.
const STATUS: Record<string, [StatusTone, string]> = {
  // Lesson & course publish status
  active: ["success", "เผยแพร่แล้ว"],
  draft: ["muted", "ฉบับร่าง"],
  // Assignment submissions
  graded: ["success", "ตรวจแล้ว"],
  submitted: ["info", "ส่งแล้ว"],
  "not-submitted": ["muted", "ยังไม่ส่ง"],
  late: ["danger", "ส่งล่าช้า"],
  // Student lesson progress
  "in-progress": ["primary", "กำลังเรียน"],
  "not-started": ["outline", "ยังไม่เริ่ม"],
  "locked-pretest": ["warning", "ต้องทำ Pre-test"],
  // General
  archived: ["muted", "จัดเก็บแล้ว"],
  upcoming: ["primary", "กำลังจะมาถึง"],
}

/** Tone badge with a leading dot. */
export function ToneBadge({ tone = "muted", children, className }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn(toneClass[tone], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  )
}

/** As the old one: `active` / `draft` render nothing unless `showPublish`. Unknown status shows its own text. */
export function StatusBadge({ status, showPublish = false }: { status?: string | null; showPublish?: boolean }) {
  if (!status) return null
  if (!showPublish && (status === "active" || status === "draft")) return null
  const [tone, label] = STATUS[status] ?? ["muted", status]
  return <ToneBadge tone={tone}>{label}</ToneBadge>
}
