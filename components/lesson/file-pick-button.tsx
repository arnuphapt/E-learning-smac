"use client"

import { useRef, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** Button that opens the file dialog; the (hidden) file input carries the accessible name. */
export function FilePickButton({
  label,
  accept,
  disabled,
  variant = "default",
  size = "sm",
  icon,
  children,
  onFile,
}: {
  label: string
  accept?: string
  disabled?: boolean
  variant?: "default" | "outline"
  size?: "sm" | "default"
  icon: ReactNode
  children: ReactNode
  onFile: (file: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button type="button" variant={variant} size={size} disabled={disabled} onClick={() => ref.current?.click()}>
        {icon}
        {children}
      </Button>
      <Input
        ref={ref}
        type="file"
        aria-label={label}
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) onFile(file)
        }}
      />
    </>
  )
}
