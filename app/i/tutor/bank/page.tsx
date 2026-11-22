"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { ClipboardListIcon } from "lucide-react"
import { filterBank, topicNames } from "@/lib/tutor-bank"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { loadTutorBank, type BankData } from "@/components/tutor/bank-data"
import { BankFilters } from "@/components/tutor/bank-filters"
import { BankListItem } from "@/components/tutor/bank-list-item"
import { getErrorMessage } from "@/components/tutor/sets"

const PAGE = 50 // rows rendered at once; "แสดงเพิ่ม" adds another page

// Standalone view of every tutor bank question the caller manages. Same data path and visibility rule as /i/tutor
// (RLS-backed client reads of courses_all / lessons / questions + visibleTutorSets); editing stays in /i/lesson/[id]/bank.
export default function InstructorTutorBank() {
  const { data: session } = useSession()
  const user = session?.user
  const [data, setData] = useState<BankData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [setId, setSetId] = useState("")
  const [lessonId, setLessonId] = useState("")
  const [topic, setTopic] = useState("")
  const [q, setQ] = useState("")
  const [limit, setLimit] = useState(PAGE)

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

  const rows = data?.rows
  const scoped = useMemo(() => (rows ? filterBank(rows, { setId, lessonId }) : []), [rows, setId, lessonId])
  const topics = useMemo(() => topicNames(scoped), [scoped])
  const shown = useMemo(() => (rows ? filterBank(rows, { setId, lessonId, topic, q }) : []), [rows, setId, lessonId, topic, q])

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

  const { sets, lessons, setById, lessonById } = data
  const lessonOptions = lessons.filter((l) => !setId || l.course_id === setId)

  return (
    <PageContainer>
      <PageHeader kicker="โหมดติว" title="คลังข้อสอบ" description={`${data.rows.length} ข้อทั้งหมด · ${sets.length} ชุดติว · ${lessons.length} บทเรียน`} />

      <BankFilters
        sets={sets}
        lessons={lessonOptions}
        topics={topics}
        setId={setId}
        lessonId={lessonId}
        topic={topic}
        q={q}
        onSet={(v) => {
          setSetId(v)
          setLessonId("")
          setTopic("")
          setLimit(PAGE)
        }}
        onLesson={(v) => {
          setLessonId(v)
          setTopic("")
          setLimit(PAGE)
        }}
        onTopic={(v) => {
          setTopic(v)
          setLimit(PAGE)
        }}
        onQ={(v) => {
          setQ(v)
          setLimit(PAGE)
        }}
      />

      <div className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        แสดง <b className="tabular-nums text-foreground">{Math.min(shown.length, limit)}</b> จาก <b className="tabular-nums text-foreground">{shown.length}</b> ข้อ
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<ClipboardListIcon />}
          title={data.rows.length === 0 ? "ยังไม่มีข้อสอบในคลัง" : "ไม่พบข้อสอบตามตัวกรอง"}
          description={data.rows.length === 0 ? "เพิ่มข้อสอบได้ที่หน้าคลังข้อสอบของแต่ละบทในชุดติว" : "ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา"}
        />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          {shown.slice(0, limit).map((r) => (
            <BankListItem key={r.id} r={r} lesson={lessonById.get(r.lessonId)} set={setById.get(r.setId)} />
          ))}
        </Card>
      )}

      {shown.length > limit && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setLimit((n) => n + PAGE)}>
            แสดงเพิ่ม
          </Button>
        </div>
      )}
    </PageContainer>
  )
}
