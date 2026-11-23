import Link from "next/link"
import { AlertTriangleIcon, ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Full-page notice that stops a student from taking a test (past due, no attempts left) with a way back to the lesson. */
export function TestNotice({ tone, title, description, lessonId }: { tone: "danger" | "warning"; title: string; description: string; lessonId: string }) {
  return (
    <Card className="mx-auto mt-6 max-w-lg text-center">
      <CardContent className="flex flex-col items-center gap-3 py-4">
        <div className={cn("grid size-16 place-items-center rounded-2xl", tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning-soft text-warning")}>
          <AlertTriangleIcon className="size-6" />
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mb-2 text-sm text-muted-foreground text-pretty">{description}</p>
        <Button asChild>
          <Link href={"/s/lesson/" + lessonId}>
            <ArrowLeftIcon />
            กลับสู่บทเรียน
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
