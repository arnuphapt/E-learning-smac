"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { ArrowLeftIcon, ChartColumnIcon, CircleCheckIcon, ClipboardListIcon, ClockIcon, DownloadIcon, FileTextIcon, TriangleAlertIcon } from "lucide-react"
import { StatCards } from "@/components/common/stat-cards"
import { supabase } from "@/lib/supabase"
import { DEFAULT_DOMAIN } from "@/lib/course-access"
import type { Database } from "@/lib/database.types"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { DataTable } from "@/components/common/data-table"
import { EmptyState, LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnswerReviewDialog } from "@/components/grading/answer-review-dialog"
import { asgScoreColumns, testScoreColumns, type AsgScoreItem, type TestScoreItem } from "@/components/grading/score-columns"
import { ScoreStatCards } from "@/components/grading/score-stat-cards"
import { average, exportScoresExcel, filterEnrolledStudents, type CourseAllRow, type ScoresBundleData, type StudentFallback, type TestKind, type TestScoreRow } from "@/components/grading/scores"

type LessonRow = Database["public"]["Tables"]["lessons"]["Row"]

interface SelectedSubmission {
  student: StudentFallback
  record: TestScoreRow
  kind: TestKind
}

const EMPTY_DATA: ScoresBundleData = {
  questions: [],
  assignments: [],
  submissions: [],
  testScores: [],
  students: [],
  studentGrades: [],
  sectionsList: [],
}

function ScoresContent() {
  const router = useRouter()
  const params = useParams()
  const { status } = useSession()

  const rawId = params?.id
  const lessonId = Array.isArray(rawId) ? rawId[0] : rawId

  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [course, setCourse] = useState<Partial<CourseAllRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"test" | "asg">("test")
  const [data, setData] = useState<ScoresBundleData>(EMPTY_DATA)
  const [selectedSubmission, setSelectedSubmission] = useState<SelectedSubmission | null>(null)

  useEffect(() => {
    if (status === "loading" || !lessonId) return
    const load = async () => {
      let redirected = false
      try {
        const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single()
        if (!lData) {
          setLoading(false)
          return
        }

        // courses_all, not the `courses` view: the view hides tutor sets.
        const { data: cData } = lData.course_id ? await supabase.from("courses_all").select("*").eq("id", lData.course_id).single() : { data: null }
        // tutor lessons have no pre/post scores: back to the tutor workspace
        if (cData?.kind === "tutor") {
          redirected = true
          router.replace("/i/tutor/" + cData.id + "?lesson=" + lessonId)
          return
        }

        const [qRes, aRes, subRes, tsRes, stRes, sgRes, secRes] = await Promise.all([
          supabase.from("questions").select("*").eq("lesson_id", lessonId).order("no", { ascending: true }),
          supabase.from("assignments").select("*").eq("lesson_id", lessonId),
          supabase.from("submissions").select("*"),
          supabase.from("test_scores").select("*").eq("lesson_id", lessonId),
          supabase.from("users").select("*").eq("role", "student"),
          supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
          supabase.from("sections").select("*"),
        ])

        const assignmentIds = aRes.data?.map((a) => a.id) || []
        const finalSubmissions = (subRes.data || []).filter((sub) => Boolean(sub.assignment_id && assignmentIds.includes(sub.assignment_id)))

        setLesson(lData)
        setCourse(cData || { code: "", title: "" })
        setData({
          questions: qRes.data || [],
          assignments: aRes.data || [],
          submissions: finalSubmissions,
          testScores: tsRes.data || [],
          students: stRes.data || [],
          studentGrades: sgRes.data || [],
          sectionsList: secRes?.data || [],
        })
      } catch (error: unknown) {
        console.error(error)
        toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + (error instanceof Error ? error.message : String(error)))
      } finally {
        if (!redirected) setLoading(false)
      }
    }
    load()
  }, [lessonId, status, router])

  const enrolledStudents = useMemo(() => (course ? filterEnrolledStudents(data, course) : []), [data, course])
  const enrolledScores = useMemo(() => {
    const ids = enrolledStudents.map((s) => s.id)
    return data.testScores.filter((ts) => Boolean(ts.student_id && ids.includes(ts.student_id)))
  }, [data.testScores, enrolledStudents])

  const testRows = useMemo<TestScoreItem[]>(
    () =>
      enrolledScores.map((r) => {
        const s: StudentFallback = enrolledStudents.find((student) => student.id === r.student_id) || { name: "Unknown", student_no: "-", section: "-" }
        return {
          id: r.student_id ?? r.id,
          name: s.name,
          studentNo: s.student_no,
          section: s.section || "-",
          student: s,
          record: r,
          pre: r.pre,
          post: r.post,
          total: r.total,
          diff: r.post != null && r.pre != null ? r.post - r.pre : null,
        }
      }),
    [enrolledScores, enrolledStudents],
  )

  const asgRows = useMemo<AsgScoreItem[]>(
    () =>
      data.submissions.map((sub) => {
        const s: StudentFallback = enrolledStudents.find((student) => student.id === sub.student_id) || { name: "Unknown", student_no: "-" }
        const asg = data.assignments.find((a) => a.id === sub.assignment_id) || { title: "ใบงานประกอบบทเรียน" }
        return { id: sub.id, name: s.name, studentNo: s.student_no, assignmentTitle: asg.title, status: sub.status, submittedAt: sub.submitted_at, sub }
      }),
    [data.submissions, data.assignments, enrolledStudents],
  )

  const testColumns = useMemo(() => testScoreColumns((item, kind) => setSelectedSubmission({ student: item.student, record: item.record, kind })), [])
  const sectionOptions = useMemo(
    () => [...new Set(testRows.map((r) => r.section).filter((s) => s && s !== "-"))].sort().map((s) => ({ value: s, label: s })),
    [testRows],
  )
  const asgStatusOptions = useMemo(
    () => [
      { value: "submitted", label: "รอตรวจ" },
      { value: "graded", label: "ตรวจแล้ว" },
      { value: "late", label: "ส่งช้า" },
      { value: "not-submitted", label: "ยังไม่ส่ง" },
    ],
    [],
  )

  if (loading) return <PageContainer><LoadingState /></PageContainer>
  if (!lesson || !course) {
    return (
      <PageContainer>
        <EmptyState icon={<TriangleAlertIcon />} title="ไม่พบบทเรียน" description="ไม่พบบทเรียนตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของบทเรียนนี้" />
      </PageContainer>
    )
  }

  const total = enrolledStudents.length
  const statCards = [
    { label: "ทำ Pre-test แล้ว", value: `${enrolledScores.filter((ts) => ts.pre != null).length}/${total} คน`, icon: <ClipboardListIcon /> },
    { label: "ทำ Post-test แล้ว", value: `${enrolledScores.filter((ts) => ts.post != null).length}/${total} คน`, icon: <CircleCheckIcon /> },
    { label: "คะแนนเฉลี่ย Pre-test", value: `${average(enrolledScores.map((ts) => ts.pre))} คะแนน`, icon: <ChartColumnIcon /> },
    { label: "คะแนนเฉลี่ย Post-test", value: `${average(enrolledScores.map((ts) => ts.post))} คะแนน`, icon: <ChartColumnIcon /> },
  ]

  return (
    <PageContainer>
      <PageHeader
        kicker={`${course.code} · บทที่ ${lesson.index}`}
        title={`รายงานคะแนนนักศึกษา: ${lesson.title}`}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/i/lesson/" + lesson.id)}>
              <ArrowLeftIcon />
              กลับสู่บทเรียน
            </Button>
            <Button
              onClick={() => {
                exportScoresExcel({ enrolledStudents, enrolledScores, data, courseCode: course.code, lessonIndex: lesson.index })
                toast.success("ส่งออกไฟล์คะแนนสำเร็จ")
              }}
            >
              <DownloadIcon />
              ส่งออกเป็น Excel
            </Button>
          </>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as "test" | "asg")}>
        <TabsList>
          <TabsTrigger value="test">
            <ClipboardListIcon />
            คะแนน Pre/Post-test
          </TabsTrigger>
          <TabsTrigger value="asg">
            <FileTextIcon />
            คะแนนใบงาน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test">
          <ScoreStatCards items={statCards} />
          <h2 className="text-base font-bold">ตารางคะแนนแบบทดสอบ</h2>
          <p className="mb-3 text-sm text-muted-foreground">แสดงคะแนนการทำแบบทดสอบก่อนเรียนและหลังเรียนของนักศึกษาที่มีสิทธิ์ในรายวิชา</p>
          <DataTable.Root data={testRows} columns={testColumns} getRowId={(r: TestScoreItem) => r.id} searchKeys={["name", "studentNo"]}>
            <DataTable.Toolbar>
              <DataTable.Search placeholder="ค้นหานักศึกษา..." />
              {sectionOptions.length > 0 && <DataTable.Filter column="section" options={sectionOptions} allLabel="ทุก Section" />}
            </DataTable.Toolbar>
            <DataTable.Content empty={<EmptyState title="ยังไม่มีข้อมูลคะแนน" />} />
            <DataTable.Pagination />
          </DataTable.Root>
          {selectedSubmission && (
            <AnswerReviewDialog {...selectedSubmission} questions={data.questions} lessonIndex={lesson.index} onClose={() => setSelectedSubmission(null)} />
          )}
        </TabsContent>

        <TabsContent value="asg">
          <StatCards
            stats={[
              { label: "รายการส่งทั้งหมด", value: asgRows.length, icon: <FileTextIcon /> },
              { label: "รอตรวจ", value: asgRows.filter((r) => r.status === "submitted").length, icon: <ClockIcon />, tone: "warning" },
              { label: "ตรวจแล้ว", value: asgRows.filter((r) => r.status === "graded").length, icon: <CircleCheckIcon />, tone: "success" },
              { label: "ส่งช้า / ยังไม่ส่ง", value: asgRows.filter((r) => r.status === "late" || r.status === "not-submitted").length, icon: <TriangleAlertIcon />, tone: "destructive" },
            ]}
          />
          <h2 className="text-base font-bold">รายการส่งใบงานนักศึกษา</h2>
          <p className="mb-3 text-sm text-muted-foreground">แสดงรายการส่งใบงานและคะแนนของนักศึกษาที่มีสิทธิ์ในรายวิชา</p>
          <DataTable.Root data={asgRows} columns={asgScoreColumns} getRowId={(r: AsgScoreItem) => r.id} searchKeys={["name", "studentNo", "assignmentTitle"]}>
            <DataTable.Toolbar>
              <DataTable.Search placeholder="ค้นหานักศึกษา หรือใบงาน..." />
              <DataTable.Filter column="status" options={asgStatusOptions} allLabel="ทุกสถานะ" />
            </DataTable.Toolbar>
            <DataTable.Content empty={<EmptyState title="ยังไม่มีการส่งใบงาน" />} />
            <DataTable.Pagination />
          </DataTable.Root>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

export default function LessonScoresPage() {
  return (
    <Suspense fallback={<PageContainer><LoadingState /></PageContainer>}>
      <ScoresContent />
    </Suspense>
  )
}
