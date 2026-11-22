import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

/** Four small stat tiles: icon + label above, value below. */
export function ScoreStatCards({ items }: { items: Array<{ label: string; value: string; icon: ReactNode }> }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <Card key={s.label}>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground [&_svg]:size-3.5 [&_svg]:text-primary">
              {s.icon}
              {s.label}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
