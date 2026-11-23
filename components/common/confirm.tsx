"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Options for `useConfirm`. */
export type ConfirmOptions = {
  title?: string
  /** Short line under the title. */
  desc?: string
  /** Body text; newlines are kept. */
  message?: ReactNode
  danger?: boolean
  cancelText?: string
  confirmText?: string
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  // Kept after close so the dialog does not go blank during its exit animation.
  const [options, setOptions] = useState<ConfirmOptions>({})
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    resolver.current?.(false)
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpen(false)
  }

  const { danger, title, desc, message, cancelText, confirmText } = options

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(next) => !next && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title || (danger ? "ยืนยันการลบข้อมูล" : "ยืนยันการดำเนินการ")}</AlertDialogTitle>
            <AlertDialogDescription>{desc ?? message}</AlertDialogDescription>
          </AlertDialogHeader>
          {desc && message && <p className="whitespace-pre-line text-sm text-foreground">{message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelText || "ยกเลิก"}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(danger && buttonVariants({ variant: "destructive" }))}
              onClick={() => settle(true)}
            >
              {confirmText || "ยืนยัน"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error("useConfirm must be used within a ConfirmProvider")
  return confirm
}
