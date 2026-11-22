"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { parseCriteria, type RubricCriterion } from "@/components/lesson/types"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, LoadingState } from "@/components/common/states"
import { StatusBadge, ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { RubricPanel } from "@/components/grading/rubric-panel"
import { distributeScore } from "@/components/grading/rubric"
import { StudentCell } from "@/components/grading/student-cell"
import { SubmissionViewer } from "@/components/grading/submission-viewer"

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]

interface StudentSummary {
  name: string
  student_no?: string | null
  section?: string | null
}

interface AssignmentSummary {
  id?: string
  title: string
  points: number | null
}

interface RubricViewState {
  title?: string
  criteria: RubricCriterion[]
}

export default function Grader() {
  const router = useRouter()
  const params = useParams()
  const nav = (path: string) => router.push(path)

  const rawId = params?.id
  const subId = Array.isArray(rawId) ? rawId[0] : rawId
  const [sub, setSub] = useState<SubmissionRow | null>(null)
  const [student, setStudent] = useState<StudentSummary | null>(null)
  const [a, setA] = useState<AssignmentSummary | null>(null)
  const [rubric, setRubric] = useState<RubricViewState | null>(null)
  const [gradable, setGradable] = useState<SubmissionRow[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!subId) return
      const { data: sData } = await supabase.from("submissions").select("*").eq("id", subId).single()
      if (!sData) {
        setLoading(false)
        return
      }

      const [uRes, aRes, subsRes] = await Promise.all([
        sData.student_id ? supabase.from("users").select("*").eq("id", sData.student_id).single() : Promise.resolve({ data: null }),
        sData.assignment_id ? supabase.from("assignments").select("*").eq("id", sData.assignment_id).single() : Promise.resolve({ data: null }),
        sData.assignment_id
          ? supabase.from("submissions").select("*").eq("assignment_id", sData.assignment_id).neq("status", "not-submitted")
          : Promise.resolve({ data: null }),
      ])

      let rubData = null
      if (aRes.data?.rubric_id) {
        const { data: r2 } = await supabase.from("rubrics").select("*").eq("id", aRes.data.rubric_id).single()
        rubData = r2
      }

      setSub(sData)
      setStudent(uRes.data || { name: "Unknown", student_no: "-", section: "-" })
      setA(aRes.data || { title: "Unknown", points: 100 })
      const criteria = parseCriteria(rubData?.criteria)
      setRubric(rubData ? { title: rubData.title, criteria } : { criteria: [] })
      setGradable(subsRes.data || [])

      if (rubData) {
        setScores(distributeScore(sData.score, criteria, aRes.data?.points || 100))
      }
      if (sData.score != null) {
        setFeedback("งานเขียนกระบวนการพยาบาลครบถ้วน จัดลำดับความสำคัญได้ดี ควรเพิ่มการอ้างอิงหลักฐานเชิงประจักษ์ที่ทันสมัย")
      }
      setLoading(false)
    }
    load()
  }, [subId])

  if (loading) return <PageContainer><LoadingState /></PageContainer>
  if (!sub || !student || !a) {
    return (
      <PageContainer>
        <EmptyState icon={<TriangleAlertIcon />} title="ไม่พบข้อมูลการส่งงาน" description="ไม่พบรายละเอียดการส่งงานของนักเรียนคนนี้ หรือรหัสการส่งงานไม่ถูกต้อง" />
      </PageContainer>
    )
  }

  const total = Object.values(scores).reduce((s, v) => s + v, 0)
  const idx = gradable.findIndex((s) => s.id === sub.id)

  const handleSaveScore = async (graded: boolean) => {
    const statusToSet = graded ? "graded" : sub.status
    try {
      const { error } = await supabase.from("submissions").update({ score: total, status: statusToSet }).eq("id", sub.id)
      if (error) throw error

      toast.success(graded ? "ส่งคะแนนและข้อเสนอแนะแล้ว" : "บันทึกฉบับร่างแล้ว")

      setTimeout(() => {
        if (graded && idx !== -1 && idx < gradable.length - 1) {
          nav("/i/grade/" + gradable[idx + 1].id)
        } else {
          nav("/i/submissions/" + a.id)
        }
      }, 700)
    } catch (err: unknown) {
      console.error("Error saving score:", err)
      toast.error("เกิดข้อผิดพลาดในการบันทึกคะแนน: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        kicker={a.title}
        title={`ตรวจงาน — ${student.name}`}
        actions={
          <>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              งานที่ {idx + 1}/{gradable.length}
            </span>
            <Button variant="outline" size="icon" aria-label="งานก่อนหน้า" disabled={idx <= 0} onClick={() => nav("/i/grade/" + gradable[idx - 1]?.id)}>
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon" aria-label="งานถัดไป" disabled={idx === -1 || idx >= gradable.length - 1} onClick={() => nav("/i/grade/" + gradable[idx + 1]?.id)}>
              <ChevronRightIcon />
            </Button>
            <Button variant="outline" onClick={() => nav("/i/submissions/" + a.id)}>
              <ArrowLeftIcon />
              กลับไปรายการส่งงาน
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-3">
          <div className="flex items-center justify-between">
            <StudentCell name={student.name} studentNo={`${student.student_no || "-"} · ${student.section || "-"}`} />
            <div className="flex items-center gap-2">
              {sub.late && <ToneBadge tone="warning">ส่งล่าช้า</ToneBadge>}
              <StatusBadge status={sub.status} />
            </div>
          </div>
          <SubmissionViewer sub={sub} />
        </div>

        <RubricPanel
          title={rubric?.title}
          criteria={rubric?.criteria ?? []}
          scores={scores}
          onScore={(id, n) => setScores((s) => ({ ...s, [id]: n }))}
          feedback={feedback}
          onFeedback={setFeedback}
          points={a.points}
          onSave={handleSaveScore}
        />
      </div>
    </PageContainer>
  )
}
