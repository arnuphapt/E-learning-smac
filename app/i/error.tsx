"use client"

import { useEffect } from "react"
import { PageContainer } from "@/components/common/page-container"
import { ErrorState } from "@/components/common/states"

export default function InstructorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Instructor segment error:", error)
  }, [error])

  return (
    <PageContainer>
      <ErrorState
        title="เกิดข้อผิดพลาด"
        description="ระบบพบปัญหาในการโหลดหรือแสดงผลข้อมูล กรุณาลองใหม่อีกครั้ง"
        onRetry={reset}
        retryLabel="ลองใหม่"
      />
    </PageContainer>
  )
}
