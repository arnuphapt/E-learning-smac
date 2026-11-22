"use client"

import type { ReactNode } from "react"
import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** Create/edit dialog shell for master data: mount it only while editing, unmount to close. Enter submits. */
export function MasterFormDialog({
  title,
  description,
  onClose,
  onSubmit,
  children,
  className,
  submitIcon,
}: {
  title: string
  description: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
  /** e.g. "sm:max-w-2xl" for wide forms. */
  className?: string
  /** Defaults to a check mark. */
  submitIcon?: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={className}>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit">
              {submitIcon ?? <CheckIcon />}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
