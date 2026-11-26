"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState, LoadingState } from "@/components/common/states"
import { loadTutorBank, type BankData } from "@/components/tutor/bank-data"
import { BankOverview } from "@/components/tutor/bank-overview"
import { getErrorMessage } from "@/components/tutor/sets"

// Standalone view of every tutor bank question the caller manages. Same data path and visibility rule as /i/tutor
// (RLS-backed client reads of courses_all / lessons / questions + visibleTutorSets); editing stays in /i/lesson/[id]/bank.
export default function InstructorTutorBank() {
  const { data: session } = useSession()
  const user = session?.user
  const [data, setData] = useState<BankData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userId = user?.id
    if (!user || !userId) return
    let cancelled = false
    loadTutorBank(user, userId)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(getErrorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (error !== null) {
    return (
      <PageContainer>
        <ErrorState title="โหลดคลังข้อสอบไม่สำเร็จ" description={error} />
      </PageContainer>
    )
  }
  if (!data) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader kicker="โหมดติว" title="คลังข้อสอบ" description="ข้อสอบทุกข้อของชุดติวที่คุณดูแล เลือกแถวเพื่อไปแก้ไขในคลังข้อสอบของบทนั้น" />
      <BankOverview data={data} />
    </PageContainer>
  )
}
