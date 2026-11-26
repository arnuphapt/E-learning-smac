import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"

/** Neutral outline pill for course codes. */
export function CourseCodeBadge({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
      {children}
    </Badge>
  )
}
