import { ToneBadge } from "@/components/common/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { STATUS_LABEL, type AnalysisSummary } from "@/lib/tutor-analysis"
import { STATUS_TONE } from "./result-types"

/** "หัวข้อที่ควรทบทวน": weak / fair topics with the reason. */
export function ReviewTopicsCard({ items }: { items: AnalysisSummary["review"] }) {
  return (
    <Card className="mb-4">
      <CardContent>
        <h2 className="mb-3 font-bold">หัวข้อที่ควรทบทวน</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีหัวข้อที่ต้องทบทวนเพิ่ม ทุกหัวข้อเป็นจุดแข็ง</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((x) => (
              <div key={x.topic_id ?? "none"} className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3">
                <ToneBadge tone={STATUS_TONE[x.status]}>{STATUS_LABEL[x.status]}</ToneBadge>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{x.name}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{x.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
