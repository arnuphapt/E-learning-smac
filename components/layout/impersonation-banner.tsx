"use client"

import { useEffect, useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { EyeIcon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

const ID_KEY = "original_admin_id"
const NAME_KEY = "original_admin_name"

/** Shown while an admin is impersonating another user; "ยกเลิก" signs back in as the admin. */
export function ImpersonationBanner() {
  const { data: session, status } = useSession()
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null)
  const [originalAdminName, setOriginalAdminName] = useState<string | null>(null)
  const [isReverting, setIsReverting] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      localStorage.removeItem(ID_KEY)
      localStorage.removeItem(NAME_KEY)
    }
    const adminId = status === "authenticated" ? localStorage.getItem(ID_KEY) : null
    const adminName = status === "authenticated" ? localStorage.getItem(NAME_KEY) : null
    const timer = setTimeout(() => {
      const impersonating = !!adminId && session?.user?.id !== adminId
      setOriginalAdminId(impersonating ? adminId : null)
      setOriginalAdminName(impersonating ? adminName : null)
    }, 0)
    return () => clearTimeout(timer)
  }, [session, status])

  const cancelImpersonation = async () => {
    if (!originalAdminId) return
    setIsReverting(true)
    const toastId = toast.loading("กำลังยกเลิกการสวมบทบาท...")
    const result = await signIn("credentials", { userId: originalAdminId, callbackUrl: "/i/courses", redirect: false })
    if (result?.error) {
      toast.error("เกิดข้อผิดพลาดในการสลับกลับ: " + result.error, { id: toastId })
      setIsReverting(false)
      return
    }
    toast.success("คืนสู่สิทธิ์ผู้ดูแลระบบเรียบร้อยแล้ว", { id: toastId })
    localStorage.removeItem(ID_KEY)
    localStorage.removeItem(NAME_KEY)
    setTimeout(() => {
      window.location.href = "/i/courses"
    }, 600)
  }

  if (!originalAdminId) return null

  return (
    <Alert className="sticky top-0 z-50 flex items-center justify-between gap-3 rounded-none border-x-0 border-t-0 bg-secondary text-secondary-foreground">
      <EyeIcon className="shrink-0" />
      <AlertDescription className="flex-1 text-secondary-foreground">
        <span>
          คุณกำลังสวมบทบาทเป็น <strong>{session?.user?.name || "นักศึกษา"}</strong> (สลับบทบาทมาจากผู้ดูแล: {originalAdminName})
        </span>
      </AlertDescription>
      <Button size="sm" onClick={cancelImpersonation} disabled={isReverting}>
        {isReverting ? "กำลังดำเนินการ..." : "ยกเลิกการสวมบทบาท"}
      </Button>
    </Alert>
  )
}
