import { BotIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { AiStatus } from "@/components/student/ai/types"
import { cn } from "@/lib/utils"

/** The assistant face for one emotion (public/New folder/<emotion>.png) with an optional online/offline dot. */
export function AiAvatar({ emotion, status, className }: { emotion: string; status?: AiStatus; className?: string }) {
  return (
    <div className="relative shrink-0">
      <Avatar className={cn("size-9 rounded-lg border", className)}>
        <AvatarImage src={encodeURI(`/New folder/${emotion}.png`)} alt={`AI Assistant ${emotion}`} className="object-cover" />
        <AvatarFallback className="rounded-lg">
          <BotIcon className="size-4" />
        </AvatarFallback>
      </Avatar>
      {status && (
        <span
          role="img"
          aria-label={status}
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background",
            status === "online" ? "animate-pulse bg-success" : status === "degraded" ? "bg-warning" : "bg-destructive",
          )}
        />
      )}
    </div>
  )
}
