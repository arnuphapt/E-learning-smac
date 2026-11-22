import type { ReactNode } from "react"
import { AlertCircleIcon, InboxIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function LoadingState({ label = "กำลังโหลด…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 p-8 text-muted-foreground", className)}>
      <Spinner aria-label={label} />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({
  title = "ไม่มีข้อมูล",
  description,
  icon,
  action,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** Button(s) shown under the text. */
  action?: ReactNode
  className?: string
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon ?? <InboxIcon />}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

export function ErrorState({
  title = "เกิดข้อผิดพลาด",
  description,
  onRetry,
  retryLabel = "ลองอีกครั้ง",
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  return (
    <Empty className={className} role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <AlertCircleIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
