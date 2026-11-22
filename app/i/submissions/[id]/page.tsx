"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CircleCheckIcon, ClockIcon, DownloadIcon, TriangleAlertIcon, UsersIcon } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { DEFAULT_DOMAIN } from "@/lib/course-access"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { DataTable } from "@/components/common/data-table"
import { EmptyState, LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { submissionColumns, type EnrichedSubmission } from "@/components/grading/submission-columns"
import { SubmissionStatFilter, type SubmissionFilter } from "@/components/grading/submission-stat-filter"

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"]
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]
type StudentRow = Database["public"]["Tables"]["users"]["Row"]
type GradeRow = Database["public"]["Tables"]["student_grades"]["Row"]

interface FormattedAssignment extends AssignmentRow {
  courseCode: string
  courseTitle?: string
}

const ALL = "all"

export default function SubmissionList() {
  const router = useRouter()
  const params = useParams()
  const nav = (path: string) => router.push(path)

  const rawAsgId = params?.id
  const asgId = typeof rawAsgId === "string" ? rawAsgId : Array.isArray(rawAsgId) ? rawAsgId[0] : undefined

  const [a, setA] = useState<FormattedAssignment | null>(null)
  const [subs, setSubs] = useState<SubmissionRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [gradesList, setGradesList] = useState<GradeRow[]>([])
  const [filter, setFilter] = useState<SubmissionFilter>("all")
  const [filterSection, setFilterSection] = useState(ALL)
  const [filterGrade, setFilterGrade] = useState(ALL)
  const [loading, setLoading] = useState(true)
  const [allAssignments, setAllAssignments] = useState<FormattedAssignment[]>([])

  useEffect(() => {
    async function load() {
      if (!asgId) return

      // Fetch all assignments and courses to populate selector & find fallback
      const [allAsgRes, allCoursesRes] = await Promise.all([
        supabase.from("assignments").select("*"),
        supabase.from("courses_all").select("*"), // not the `courses` view: it hides tutor sets
      ])

      const formattedAsgs: FormattedAssignment[] = (allAsgRes.data || []).map((asg) => {
        const c = (allCoursesRes.data || []).find((co) => co.id === asg.course_id)
        return { ...asg, courseCode: c ? c.code : "Unknown", courseTitle: c ? c.title : undefined }
      })
      setAllAssignments(formattedAsgs)

      // Check if current asgId is valid
      const currentAsg = formattedAsgs.find((asg) => asg.id === asgId)

      if (!currentAsg) {
        // If current is not found (like mock 'a1'), redirect to the first available assignment
        if (formattedAsgs.length > 0) {
          router.replace("/i/submissions/" + formattedAsgs[0].id)
          return
        }
        setLoading(false)
        return
      }

      const [subRes, stRes, gRes] = await Promise.all([
        supabase.from("submissions").select("*").eq("assignment_id", currentAsg.id),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("student_grades").select("*").eq("domain", DEFAULT_DOMAIN),
      ])

      setA(currentAsg)
      setSubs(subRes.data || [])
      setStudents(stRes.data || [])
      setGradesList(gRes.data || [])
      setLoading(false)
    }
    load()
  }, [asgId, router])

  const enrichedSubs: EnrichedSubmission[] = useMemo(
    () =>
      subs.map((sub) => {
        const s = students.find((st) => st.id === sub.student_id) || { name: "Unknown", student_no: "-", section: "-" }
        const prefix = String(s.student_no).slice(0, 2)
        const gradeMapping = gradesList.find((g) => g.prefix === prefix)
        return {
          ...sub,
          studentName: s.name,
          studentNo: s.student_no,
          section: s.section,
          yearLabel: gradeMapping ? gradeMapping.year_label : "ไม่ระบุชั้นปี",
        }
      }),
    [subs, students, gradesList],
  )

  const filteredForCounts = useMemo(
    () =>
      enrichedSubs.filter((sub) => {
        if (filterSection !== ALL && sub.section !== filterSection) return false
        if (filterGrade !== ALL && sub.yearLabel !== filterGrade) return false
        return true
      }),
    [enrichedSubs, filterSection, filterGrade],
  )

  const counts = useMemo(
    () => ({
      all: filteredForCounts.length,
      submitted: filteredForCounts.filter((s) => s.status === "submitted" || s.status === "late").length,
      graded: filteredForCounts.filter((s) => s.status === "graded").length,
      "not-submitted": filteredForCounts.filter((s) => s.status === "not-submitted").length,
    }),
    [filteredForCounts],
  )

  const filteredList = useMemo(
    () =>
      filteredForCounts.filter((sub) => {
        if (filter === "all") return true
        if (filter === "submitted") return sub.status === "submitted" || sub.status === "late"
        return sub.status === filter
      }),
    [filteredForCounts, filter],
  )

  const columns = useMemo(() => submissionColumns((id) => router.push("/i/grade/" + id)), [router])

  if (loading) return <PageContainer><LoadingState /></PageContainer>
  if (!a) {
    return (
      <PageContainer>
        <EmptyState icon={<TriangleAlertIcon />} title="ไม่พบใบงาน" description="ไม่พบใบงานตามรหัสที่ระบุ หรือข้อมูลใบงานนี้ไม่มีอยู่ในระบบ" />
      </PageContainer>
    )
  }

  const statCards: Array<{ key: SubmissionFilter; label: string; count: number; icon: React.ReactNode }> = [
    { key: "all", label: "ทั้งหมด", count: counts.all, icon: <UsersIcon /> },
    { key: "submitted", label: "รอตรวจ", count: counts.submitted, icon: <ClockIcon /> },
    { key: "graded", label: "ตรวจแล้ว", count: counts.graded, icon: <CircleCheckIcon /> },
    { key: "not-submitted", label: "ยังไม่ส่ง", count: counts["not-submitted"], icon: <TriangleAlertIcon /> },
  ]

  const sections = Array.from(new Set(enrichedSubs.map((s) => s.section)))
    .filter((sec): sec is string => Boolean(sec))
    .sort()
  const grades = Array.from(new Set(gradesList.map((g) => g.year_label))).sort()

  return (
    <PageContainer>
      <PageHeader
        kicker={"ใบงาน · " + a.courseCode}
        title={a.title}
        actions={
          <>
            <Select value={asgId} onValueChange={(v) => nav("/i/submissions/" + v)}>
              <SelectTrigger aria-label="เลือกใบงาน" className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allAssignments.map((asg) => (
                  <SelectItem key={asg.id} value={asg.id}>
                    {asg.courseCode}: {asg.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => nav("/i/reports")}>
              <DownloadIcon />
              ส่งออก Excel
            </Button>
          </>
        }
      />

      <SubmissionStatFilter items={statCards} value={filter} onChange={setFilter} />

      <h2 className="mb-3 text-base font-bold">
        รายการส่งงาน {filter !== "all" && <span className="font-normal text-muted-foreground">({filteredList.length})</span>}
      </h2>
      <DataTable.Root data={filteredList} columns={columns} getRowId={(r: EnrichedSubmission) => r.id} searchKeys={["studentName", "studentNo"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหานักศึกษา..." />
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger aria-label="กรองตามกลุ่มเรียน" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>กลุ่ม: ทั้งหมด</SelectItem>
              {sections.map((sec) => (
                <SelectItem key={sec} value={sec}>
                  {sec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger aria-label="กรองตามชั้นปี" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ชั้นปี: ทั้งหมด</SelectItem>
              {grades.map((lbl) => (
                <SelectItem key={lbl} value={lbl}>
                  {lbl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DataTable.Toolbar>
        <DataTable.Content empty={<EmptyState title="ไม่พบรายการส่งงาน" />} />
        <DataTable.Pagination />
      </DataTable.Root>
    </PageContainer>
  )
}
