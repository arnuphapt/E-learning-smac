import { GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

type LandingBrandProps = {
  title?: string
  subtitle?: string
  asLink?: boolean
  className?: string
}

export function LandingBrand({
  title = "Digital Learning Space",
  subtitle,
  asLink = true,
  className,
}: LandingBrandProps) {
  const content = (
    <>
      <span className="mk">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span>
        {title}
        {subtitle && <small>{subtitle}</small>}
      </span>
    </>
  )

  if (!asLink) {
    return <div className={cn("brand", className)}>{content}</div>
  }

  return (
    <a href="#top" className={cn("brand", className)}>
      {content}
    </a>
  )
}
