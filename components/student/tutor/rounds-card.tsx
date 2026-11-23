import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { TutorRound } from "./result-types"

/** "รอบที่ทำแล้ว": one button per finished round; the current one is selected. */
export function RoundsCard({ rounds, currentId, bestId, switching, onLoad }: { rounds: TutorRound[]; currentId: string; bestId: string | null; switching: boolean; onLoad: (attemptId: string) => void }) {
  return (
    <Card className="mb-4">
      <CardContent>
        <h2 className="mb-2 font-bold">รอบที่ทำแล้ว</h2>
        <div className="flex flex-wrap gap-2">
          {rounds.map((x) => (
            <Button
              key={x.id}
              size="sm"
              variant={x.id === currentId ? "default" : "secondary"}
              disabled={switching || x.id === currentId}
              onClick={() => onLoad(x.id)}
            >
              รอบที่ {x.number} · {x.score}/{x.total}{bestId && x.id === bestId ? " ★" : ""}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">★ = รอบที่ดีที่สุด (สัดส่วนคะแนนสูงสุด ถ้าเท่ากันใช้รอบล่าสุด)</p>
      </CardContent>
    </Card>
  )
}
