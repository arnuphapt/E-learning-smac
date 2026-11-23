"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Copies `text` to the clipboard and shows "copied" for 2 s. */
export function CopyButton({
  text,
  label,
  copiedLabel = "คัดลอกแล้ว",
  className,
}: {
  text: string
  label: string
  copiedLabel?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      className={cn("h-7 gap-1.5 px-2 text-xs", copied ? "text-success" : "text-muted-foreground", className)}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? copiedLabel : label}
    </Button>
  )
}
