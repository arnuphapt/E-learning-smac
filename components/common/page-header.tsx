import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  /** Small uppercase label above the title. */
  kicker?: ReactNode
  /** Right-aligned buttons. */
  actions?: ReactNode
  /** Rendered above the title, e.g. `<AppBreadcrumb />`. */
  breadcrumb?: ReactNode
  className?: string
}

export function PageHeader({ title, description, kicker, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-5 flex flex-col gap-3", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker && <div className="mb-1 text-xs font-semibold uppercase text-primary">{kicker}</div>}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
