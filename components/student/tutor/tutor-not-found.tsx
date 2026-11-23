import Link from "next/link"
import type { ReactNode } from "react"
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react"
import { EmptyState } from "@/components/common/states"
import { Button } from "@/components/ui/button"

/** Error / dead-end panel of the tutor pages with one link back (default: the tutor set list). */
export function TutorNotFound({
  title,
  description,
  href = "/s/tutor",
  action = "กลับไปรายการชุดติว",
  icon,
}: {
  title: string
  description: string
  href?: string
  action?: string
  icon?: ReactNode
}) {
  return (
    <EmptyState
      icon={icon ?? <AlertCircleIcon />}
      title={title}
      description={description}
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href={href}>
            <ArrowLeftIcon />
            {action}
          </Link>
        </Button>
      }
    />
  )
}
