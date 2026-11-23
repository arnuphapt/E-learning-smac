import type { ReactNode } from "react"
import { AlertTriangleIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

/** Inline notice of the tutor exam: `danger` (red) for save / submit / time-up problems, `warning` for rules and notes. */
export function ExamAlert({ tone, children, action, className }: { tone: "danger" | "warning"; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <Alert
      variant={tone === "danger" ? "destructive" : "default"}
      className={cn(tone === "danger" ? "border-destructive/30 bg-destructive/10" : "border-transparent bg-warning-soft text-warning", className)}
    >
      <AlertTriangleIcon />
      <AlertDescription className={cn("flex items-center justify-between gap-3", tone === "warning" && "text-warning")}>
        <span>{children}</span>
        {action}
      </AlertDescription>
    </Alert>
  )
}
