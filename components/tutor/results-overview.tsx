import type { LessonSummary } from "@/lib/tutor-results"
import { PASS_PERCENT, STRONG_PERCENT } from "@/lib/tutor-analysis"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function Fig({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="border-l pl-4 first:border-l-0 first:pl-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-3xl font-bold tabular-nums">
        {value}
        {unit && <small className="ml-1 text-sm font-medium text-muted-foreground">{unit}</small>}
      </dd>
    </div>
  )
}

/** "ภาพรวมบทนี้": four figures and the weak / fair / strong spread bar. */
export function ResultsOverview({ s }: { s: LessonSummary }) {
  const total = s.spread.weak + s.spread.fair + s.spread.strong
  const segments = [
    { key: "weak", cls: "bg-destructive", n: s.spread.weak, text: `ต่ำกว่า ${PASS_PERCENT}%` },
    { key: "fair", cls: "bg-warning", n: s.spread.fair, text: `${PASS_PERCENT}–${STRONG_PERCENT - 1}%` },
    { key: "strong", cls: "bg-success", n: s.spread.strong, text: `${STRONG_PERCENT}% ขึ้นไป` },
  ] as const
  return (
    <Card>
      <CardHeader>
        <CardTitle>ภาพรวมบทนี้</CardTitle>
        <CardDescription>นับเฉพาะรอบที่ส่งแล้วหรือหมดเวลา ใช้รอบที่ได้คะแนนดีที่สุดของนักศึกษาแต่ละคน และแสดงเฉพาะนักศึกษาที่เคยทำบทนี้</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Fig label="นักศึกษาที่ทำแล้ว" value={s.students.length} unit="คน" />
          <Fig label="จำนวนรอบทั้งหมด" value={s.rounds} unit="รอบ" />
          <Fig label="เฉลี่ยคะแนนดีที่สุด" value={s.avgBest ?? "—"} unit={s.avgBest != null ? "%" : undefined} />
          <Fig label="กำลังทำอยู่" value={s.inProgress} unit="รอบ" />
        </dl>
        {total > 0 && (
          <div className="mt-5">
            <div
              className="flex h-3 gap-0.5"
              role="img"
              aria-label={`ต่ำกว่า ${PASS_PERCENT}% ${s.spread.weak} คน, ${PASS_PERCENT} ถึง ${STRONG_PERCENT - 1}% ${s.spread.fair} คน, ${STRONG_PERCENT}% ขึ้นไป ${s.spread.strong} คน`}
            >
              {segments.map((g) => g.n > 0 && <i key={g.key} className={`block min-w-2 rounded-full ${g.cls}`} style={{ flex: g.n }} />)}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {segments.map((g) => (
                <li key={g.key} className="flex items-center gap-2">
                  <span aria-hidden className={`size-2.5 rounded-sm ${g.cls}`} />
                  <b className="tabular-nums text-foreground">{g.n}</b> {g.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
