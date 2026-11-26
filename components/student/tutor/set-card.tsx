import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { TutorSetSummary } from "./types"

/** One tutor set tile; the whole card is the link. */
export function SetCard({ set: c }: { set: TutorSetSummary }) {
  return (
    <Card className="relative py-0 transition-colors hover:border-primary/40">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
          <Badge variant="outline" className="text-muted-foreground">ชุดติว</Badge>
        </div>
        <h2 className="text-base leading-snug font-bold">{c.title}</h2>
        <p className="min-h-9 flex-1 text-sm text-muted-foreground">{c.subtitle}</p>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpenIcon className="size-3.5" aria-hidden />
            {c.lessons} บท
          </span>
          <Button asChild size="sm">
            <Link href={"/s/tutor/" + c.id} aria-label={`เปิดชุดติว: ${c.title}`} className="after:absolute after:inset-0 after:content-['']">
              เปิดชุดติว
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
