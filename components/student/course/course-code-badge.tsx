import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { heroColor, tint } from "./types"

/** Pill in the course's own colour (computed from the database hex, so inline style). */
export function CourseCodeBadge({ hero, children }: { hero: string | null | undefined; children: ReactNode }) {
  const color = heroColor(hero)
  return (
    <Badge variant="outline" style={{ background: tint(color, 12), borderColor: tint(color, 28), color }}>
      {children}
    </Badge>
  )
}
