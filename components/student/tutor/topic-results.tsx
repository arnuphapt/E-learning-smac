import { ToneBadge } from "@/components/common/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PASS_PERCENT, STATUS_LABEL, STRONG_PERCENT, type AnalysisSummary } from "@/lib/tutor-analysis"
import { STATUS_BAR, STATUS_TONE } from "./result-types"

/** "ผลรายหัวข้อ": a bar per topic, coloured by weak / fair / strong. */
export function TopicResults({ groups }: { groups: AnalysisSummary["groups"] }) {
  return (
    <Card className="mb-4">
      <CardContent>
        <h2 className="mb-1 font-bold">ผลรายหัวข้อ</h2>
        <p className="mb-4 text-xs text-muted-foreground">ต่ำกว่า {PASS_PERCENT}% = {STATUS_LABEL.weak} · {PASS_PERCENT}–{STRONG_PERCENT - 1}% = {STATUS_LABEL.fair} · {STRONG_PERCENT}% ขึ้นไป = {STATUS_LABEL.strong}</p>
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.topic_id ?? "none"}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-semibold">{g.name}</span>
                <span className="text-xs text-muted-foreground">ถูก {g.correct}/{g.total} ข้อ · {g.percent}%</span>
                <ToneBadge tone={STATUS_TONE[g.status]}>{STATUS_LABEL[g.status]}</ToneBadge>
              </div>
              <Progress value={g.percent} className={STATUS_BAR[g.status]} aria-label={g.name + " " + g.percent + "%"} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
