import { Avatar, AvatarFallback } from "@/components/ui/avatar"

/** Avatar + name + student number, as shown in every grading table. */
export function StudentCell({ name, studentNo }: { name: string; studentNo?: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarFallback className="text-xs">{(name || "?").charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-muted-foreground">{studentNo || "-"}</div>
      </div>
    </div>
  )
}
