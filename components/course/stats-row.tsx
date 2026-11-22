import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

/** Four summary tiles at the top of the course page. */
export function CourseStats({ stats }: { stats: Array<{ label: string; value: string | number; icon: ReactNode }> }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="flex-row items-center gap-3 px-5 py-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground [&_svg]:size-5">{s.icon}</div>
          <div>
            <div className="text-2xl font-bold leading-none tabular-nums">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}
