import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

/** Four summary tiles at the top of the course page. */
export function CourseStats({ stats }: { stats: Array<{ label: string; value: string | number; icon: ReactNode }> }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="flex-row items-center gap-3 px-5 py-4">
          <span className="shrink-0 text-muted-foreground [&_svg]:size-5" aria-hidden>{s.icon}</span>
          <div>
            <div className="text-2xl font-bold leading-none tabular-nums">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}
