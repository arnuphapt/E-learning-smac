import { BookOpenIcon, UserIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { TutorSetDetail } from "./types"

/** Header card of one tutor set: code, title, subtitle, instructor and lesson count. */
export function SetHeader({ set, lessonCount }: { set: TutorSetDetail; lessonCount: number }) {
  return (
    <Card className="mb-5">
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <Badge>{set.code}</Badge>
          <Badge variant="outline" className="text-muted-foreground">ชุดติว</Badge>
        </div>
        <h1 className="mb-1.5 text-2xl font-bold tracking-tight">{set.title}</h1>
        <p className="text-muted-foreground text-pretty">{set.subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UserIcon className="size-4 text-primary" />
            {set.instructor}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpenIcon className="size-4 text-primary" />
            {lessonCount} บท
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
