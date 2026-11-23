import { GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

export function LandingBrand({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <a href="#top" className={cn("flex items-center gap-3", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className="text-left font-semibold leading-tight">
        Digital Learning Space
        {subtitle && <small className="hidden text-xs font-normal text-muted-foreground sm:block">{subtitle}</small>}
      </span>
    </a>
  )
}
