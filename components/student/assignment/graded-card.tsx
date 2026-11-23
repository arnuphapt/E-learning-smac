import { AwardIcon, MessageSquareIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getCriteriaList, type RubricRow } from "./files"

/** Result of a graded submission: total, per-criterion bars (scaled from the total) and the standard feedback note. */
export function GradedCard({
  score,
  points,
  rubric,
  instructorName,
}: {
  score: number | null | undefined
  points: number | null
  rubric: RubricRow | null
  instructorName?: string | null
}) {
  const totalScore = score || 0
  const totalMax = points || 20
  const ratio = totalMax > 0 ? totalScore / totalMax : 0
  const criteria = getCriteriaList(rubric)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-success">
          <AwardIcon className="size-[18px]" />
          ตรวจแล้ว — ผลคะแนนและข้อเสนอแนะ
        </CardTitle>
        <div className="text-2xl font-bold text-success tabular-nums">
          {totalScore}
          <span className="text-sm font-medium text-muted-foreground">/{totalMax}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-sm font-bold">คะแนนตามเกณฑ์ (Rubric)</div>
        <div className="mb-4 flex flex-col gap-2">
          {criteria.map((c) => {
            const criteriaScore = Math.min(c.max, Math.round(c.max * ratio))
            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex-1 text-sm">{c.name}</div>
                <Progress className="w-30" value={c.max > 0 ? (criteriaScore / c.max) * 100 : 0} />
                <div className="w-11 text-right text-sm font-semibold tabular-nums">
                  {criteriaScore}/{c.max}
                </div>
              </div>
            )
          })}
        </div>
        <Separator className="mb-4" />
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          <MessageSquareIcon className="size-4 text-primary" />
          ข้อเสนอแนะจากอาจารย์
        </div>
        <p className="rounded-lg bg-muted p-3.5 leading-relaxed">
          ได้รับการตรวจประเมินเรียบร้อยแล้วค่ะ ผลคะแนนโดยรวมและเกณฑ์แต่ละข้อย่อยเป็นไปตามที่ปรากฏด้านบน หากมีข้อสงสัยเพิ่มเติมกรุณาสอบถามอาจารย์ผู้สอนโดยตรงค่ะ
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="size-6">
            <AvatarFallback className="text-xs">{instructorName?.slice(0, 1) || "อ"}</AvatarFallback>
          </Avatar>
          ตรวจโดย {instructorName || "อาจารย์ผู้สอน"}
        </div>
      </CardContent>
    </Card>
  )
}
