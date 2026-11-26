import type { ReactNode } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

/** Thin progress/score bar + right-aligned tabular number. */
export function ProgressCell({
  value,
  max = 100,
  label,
  score = false,
  className,
}: {
  value: number
  max?: number
  label?: string
  /** Highlights fill and value in amber when representing a score. */
  score?: boolean
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={cn("flex min-w-28 items-center gap-2.5", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width]", score ? "bg-amber-accent" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", score ? "text-amber-accent" : "text-muted-foreground")}>
        {label ?? `${Math.round(pct)}%`}
      </span>
    </div>
  )
}

/** Initials avatar + name + optional secondary line or badge. */
export function AvatarCell({
  name,
  subtitle,
  badge,
  className,
}: {
  name: string
  subtitle?: string | null
  badge?: ReactNode
  className?: string
}) {
  const initial = (name ? name.replace(/^อ\.\s*(ดร\.\s*)?/, "") : "?").charAt(0) || "?"
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-muted text-xs font-medium text-foreground">{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-foreground">{name}</span>
          {badge}
        </div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  )
}
