import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ChecklistTone = "done" | "current" | "todo" | "locked"

/** One step of the lesson progress list; a button when it has `onClick`, plain row otherwise. */
export function ChecklistItem({
  icon: Icon,
  label,
  sub,
  tone,
  action,
  onClick,
}: {
  icon: LucideIcon
  label: string
  sub?: string
  tone: ChecklistTone
  action?: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      <Icon className={cn("size-4 shrink-0", tone === "done" ? "text-success" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-semibold">{label}</div>
        {sub && <div className="truncate text-xs font-normal text-muted-foreground">{sub}</div>}
      </div>
      {action}
    </>
  )
  if (onClick) {
    return (
      <Button type="button" variant="ghost" className="h-auto w-full justify-start gap-3 px-3 py-2.5 whitespace-normal" onClick={onClick}>
        {inner}
      </Button>
    )
  }
  return <div className="flex w-full items-center gap-3 px-3 py-2.5">{inner}</div>
}
