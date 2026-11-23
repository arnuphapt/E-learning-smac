import { BellIcon, ClockIcon, PinIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"

type BroadcastRow = Database["public"]["Tables"]["broadcasts"]["Row"]

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : ""

export function BroadcastCard({ broadcast: b }: { broadcast: BroadcastRow }) {
  const Icon = b.pinned ? PinIcon : BellIcon
  return (
    <Card className={cn("py-0", b.pinned && "border-primary/30")}>
      <CardContent className="flex items-start gap-3.5 p-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            b.pinned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold">{b.title}</span>
              {b.pinned && <Badge variant="secondary">ปักหมุด</Badge>}
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{formatDate(b.created_at)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7">{b.body}</p>
          {b.expires_at && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              <span>หมดอายุ: {formatDate(b.expires_at)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
