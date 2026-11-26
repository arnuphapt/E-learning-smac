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
    <header className={cn("mb-6 flex flex-col gap-3", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker && <div className="mb-1.5 text-xs font-semibold tracking-widest uppercase text-primary">{kicker}</div>}
          <h1 className="font-serif text-3xl leading-snug font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <svg
        className="h-4 w-full text-primary/30"
        viewBox="0 0 1200 16"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,10 L28,10 L36,10 L42,4 L49,15 L56,1 L63,10 L76,10 L1200,10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="nonScalingStroke"
        />
      </svg>
    </header>
  )
}
