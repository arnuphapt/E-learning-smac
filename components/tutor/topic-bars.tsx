import type { AnalysisStatus } from "@/lib/tutor-analysis"
import { STATUS_LABEL } from "@/lib/tutor-analysis"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export type TopicBar = {
  key: string
  name: string
  percent: number
  status: AnalysisStatus
  /** Extra text after the status label (e.g. student count). */
  note?: string
}

const INDICATOR: Record<AnalysisStatus, string> = {
  weak: "[&_[data-slot=progress-indicator]]:bg-destructive",
  fair: "[&_[data-slot=progress-indicator]]:bg-warning",
  strong: "[&_[data-slot=progress-indicator]]:bg-success",
}
const TEXT: Record<AnalysisStatus, string> = { weak: "text-destructive", fair: "text-warning", strong: "text-success" }

/** One row per topic: name, bar coloured by status, percent + status label. */
export function TopicBars({ bars }: { bars: readonly TopicBar[] }) {
  return (
    <div className="grid gap-3">
      {bars.map((b) => (
        <div key={b.key} className="grid items-center gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
          <span className="truncate text-sm font-medium" title={b.name}>
            {b.name}
          </span>
          <Progress value={b.percent} aria-label={`${b.name} ${b.percent}%`} className={cn("bg-muted", INDICATOR[b.status])} />
          <span className={cn("text-sm font-semibold tabular-nums", TEXT[b.status])}>
            {b.percent}%
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {STATUS_LABEL[b.status]}
              {b.note ? ` · ${b.note}` : ""}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
