import { cn } from "@/lib/utils"

/** Circular score meter: stroke turns success (>= 80%), primary (>= 50%) or warning. */
export function ScoreRing({ value, total, size = 132, label, className }: { value: number; total: number; size?: number; label?: string; className?: string }) {
  const pct = total ? value / total : 0
  const r = size / 2 - 11
  const c = 2 * Math.PI * r
  const tone = pct >= 0.8 ? "success" : pct >= 0.5 ? "primary" : "warning"
  const stroke = { success: "stroke-success", primary: "stroke-primary", warning: "stroke-warning" }[tone]
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`${value} ${label || "จาก " + total}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={11} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={cn("transition-[stroke-dashoffset] duration-700", stroke)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="leading-none font-bold text-amber-accent tabular-nums" style={{ fontSize: size * 0.3 }}>
            {value}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label || "จาก " + total}</div>
        </div>
      </div>
    </div>
  )
}
