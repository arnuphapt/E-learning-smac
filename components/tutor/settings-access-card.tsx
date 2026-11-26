import { CircleCheckIcon, PlusIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { DEFAULT_DOMAIN, EXTERNAL_YEAR_BASE } from "@/lib/course-access"
import { FormField } from "@/components/common/form-field"
import { SectionSelect } from "@/components/course/section-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { LookupState } from "./settings-lookup"

/** "ใครเข้าชุดนี้ได้": the lock summary with live reach, year levels, section and the special email list. */
export function SettingsAccessCard({
  lookup,
  lock,
  reach,
  years,
  onYears,
  section,
  onSection,
  emails,
  onEmails,
  onPickEmails,
}: {
  lookup: LookupState | null
  lock: { open: boolean; text: string }
  reach: number | null
  years: number[]
  onYears: (updater: (y: number[]) => number[]) => void
  section: string
  onSection: (v: string) => void
  emails: string[]
  onEmails: (updater: (e: string[]) => string[]) => void
  onPickEmails: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ใครเข้าชุดนี้ได้</CardTitle>
        <CardDescription>
          นักศึกษาเข้าได้เมื่อตรงทุกเงื่อนไขที่เลือก (ชั้นปี และ กลุ่มเรียน) หรือมีอีเมลอยู่ในรายชื่อพิเศษ ถ้าไม่เลือกอะไรเลย{" "}
          <strong className="text-foreground">จะไม่มีนักศึกษาเห็นชุดนี้</strong> ต่างจากรายวิชาปกติที่ไม่เลือกคือเปิดให้ทุกชั้นปี
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div role="status" className={cn("flex items-start gap-2 rounded-lg p-3 text-sm", lock.open ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
          {lock.open ? <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0" /> : <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />}
          <span>
            {lock.open ? `เข้าได้: ${lock.text}` : lock.text}
            {reach != null && (
              <>
                {" "}
                · <b className="tabular-nums">{reach}</b> คนเข้าได้ตามเงื่อนไขนี้
              </>
            )}
          </span>
        </div>

        <fieldset className="grid gap-3 rounded-xl border border-border/80 bg-muted/25 p-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <legend className="text-sm font-medium text-foreground">ชั้นปี</legend>
            <span className="text-xs text-muted-foreground">ไม่เลือก = ต้องมีกลุ่มเรียนหรือรายชื่อพิเศษ</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!lookup ? (
              <span className="text-sm text-muted-foreground">กำลังโหลด…</span>
            ) : lookup.yearOptions.length === 0 ? (
              <span className="text-sm text-muted-foreground">ยังไม่มีข้อมูลชั้นปีในระบบ</span>
            ) : (
              lookup.yearOptions.map(({ label, value, domain }) => {
                const on = years.includes(value)
                return (
                  <Label
                    key={value}
                    htmlFor={`ts-year-${value}`}
                    className={cn(
                      "min-h-9 cursor-pointer rounded-lg border bg-card px-3 py-1.5 text-sm transition-colors",
                      on
                        ? "border-primary bg-primary-soft/60 font-semibold text-primary-soft-foreground shadow-xs"
                        : "border-border font-normal text-foreground hover:border-primary/40 hover:bg-card",
                    )}
                  >
                    <Checkbox id={`ts-year-${value}`} checked={on} onCheckedChange={() => onYears((y) => (on ? y.filter((x) => x !== value) : [...y, value].sort((a, b) => a - b)))} />
                    {label}
                    {domain !== DEFAULT_DOMAIN && <span className="text-xs text-muted-foreground">({domain})</span>}
                  </Label>
                )
              })
            )}
            {lookup &&
              years
                .filter((y) => y >= EXTERNAL_YEAR_BASE && !lookup.yearOptions.some((o) => o.value === y))
                .map((y) => (
                  // a lock on an external year level that no longer exists matches nobody: show it so it can be unticked
                  <Label key={y} htmlFor={`ts-year-${y}`} className="min-h-9 cursor-pointer rounded-lg border border-dashed border-destructive bg-card px-3 py-1.5 text-sm font-normal text-destructive">
                    <Checkbox id={`ts-year-${y}`} checked onCheckedChange={() => onYears((l) => l.filter((x) => x !== y))} />
                    ชั้นปีที่ถูกลบ <span className="text-xs">(รหัส {y})</span>
                  </Label>
                ))}
          </div>
        </fieldset>

        <FormField label="กลุ่มเรียน / Section" htmlFor="ts-section" className="max-w-sm">
          <SectionSelect id="ts-section" value={section} onChange={onSection} sections={lookup?.sections || []} />
        </FormField>

        <div className="grid gap-2">
          <Label>รายชื่อพิเศษ (เข้าได้โดยไม่ต้องตรงชั้นปี/กลุ่มเรียน)</Label>
          <div className="flex flex-wrap items-center gap-2">
            {emails.map((e) => (
              <Badge key={e} variant="secondary" className="gap-1 pr-1">
                {lookup?.students.find((s) => s.email === e)?.name || e}
                <Button type="button" variant="ghost" size="icon" className="size-4 rounded-full" onClick={() => onEmails((l) => l.filter((x) => x !== e))} aria-label={"เอา " + e + " ออก"}>
                  <XIcon className="size-3" />
                </Button>
              </Badge>
            ))}
            <Button variant="outline" size="sm" onClick={onPickEmails} disabled={!lookup}>
              <PlusIcon />
              เพิ่มนักศึกษา
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
