import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"

/** Neutral outline pill for course codes (hero prop kept optional for caller compatibility). */
export function CourseCodeBadge({ hero: _hero, children }: { hero?: string | null; children: ReactNode }) {
  void _hero
  return (
    <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
      {children}
    </Badge>
  )
}
