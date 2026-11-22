import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Page width + padding: one wrapper for every page inside the app shell's content column. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-4 pb-24 pt-5 md:px-8 md:pb-16 md:pt-8", className)}>{children}</div>
}
