import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StatCardTone = "success" | "warning" | "info" | "destructive"

const toneClass: Record<StatCardTone, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
}

export type StatCardItem = { label: string; value: string | number; icon: ReactNode; tone?: StatCardTone }

/** Summary tiles above a page or table (course page, list pages). `tone` only tints the icon. */
export function StatCards({ stats }: { stats: readonly StatCardItem[] }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="flex-row items-center gap-3 px-5 py-4">
          <span className={cn("shrink-0 [&_svg]:size-5", s.tone ? toneClass[s.tone] : "text-muted-foreground")} aria-hidden>{s.icon}</span>
          <div>
            <div className="text-2xl font-bold leading-none tabular-nums">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}
