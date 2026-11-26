"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WizardStepItem, WizardStepKey } from "./wizard-types"

/** Step navigation rail: vertical on sm+, horizontal scroll strip on mobile. */
export function WizardRail({
  steps,
  activeStep,
  onSelect,
}: {
  steps: WizardStepItem[]
  activeStep: WizardStepKey
  onSelect: (step: WizardStepKey) => void
}) {
  return (
    <nav
      aria-label="ขั้นตอนการจัดการบทเรียน"
      className="shrink-0 border-b border-border/60 bg-muted/20 p-2 sm:w-52 sm:border-r sm:border-b-0 sm:p-3"
    >
      <ol className="flex gap-1 overflow-x-auto sm:flex-col">
        {steps.map((s, idx) => {
          const current = activeStep === s.key
          return (
            <li key={s.key} className="shrink-0 sm:shrink">
              <Button
                type="button"
                size="sm"
                variant={current ? "secondary" : "ghost"}
                aria-current={current ? "step" : undefined}
                onClick={() => onSelect(s.key)}
                className={cn(
                  "h-auto w-full justify-between gap-2 px-2.5 py-2 text-left font-normal",
                  current && "bg-primary-soft font-medium text-primary-soft-foreground hover:bg-primary-soft",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums",
                      current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate">{s.label}</span>
                </span>
                {s.hint && (
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{s.hint}</span>
                )}
              </Button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
