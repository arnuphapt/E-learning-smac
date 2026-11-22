"use client"

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { ChartColumnIcon, ClipboardListIcon, EyeIcon, FileTextIcon, FolderIcon, InfoIcon, Trash2Icon, VideoIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, LoadingState } from "@/components/common/states"
import { useConfirm } from "@/components/common/confirm"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deleteLessonCascade } from "@/components/course/actions"
import { useDeleteAssignment } from "@/components/lesson/assignment-actions"
import { AssignmentList } from "@/components/lesson/assignment-list"
import { AssignmentSheet } from "@/components/lesson/assignment-sheet"
import { DocsManage } from "@/components/lesson/docs-manage"
import { TestBuilder } from "@/components/lesson/test-builder"
import { errMsg, parseTestConfig, type AssignmentRow, type CourseAllRow, type LessonRow, type LessonTab, type LessonUpdate, type QuestionRow, type RubricRow } from "@/components/lesson/types"
import { VideoManage, type VideoManageHandle } from "@/components/lesson/video-manage"

interface LessonBundleData {
  questions: QuestionRow[]
  assignments: AssignmentRow[]
  rubrics: RubricRow[]
}

function InstructorLessonContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const confirm = useConfirm()
  const deleteAssignment = useDeleteAssignment()
  const { status } = useSession()

  const rawId = params?.id
  const lessonId = Array.isArray(rawId) ? rawId[0] : rawId
  const queryCourseId = searchParams.get("course_id")

  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [course, setCourse] = useState<Partial<CourseAllRow> | null>(null)
  const [tab, setTab] = useState<LessonTab>("video")
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)
  const [data, setData] = useState<LessonBundleData>({ questions: [], assignments: [], rubrics: [] })
  const [activeAssignment, setActiveAssignment] = useState<Partial<AssignmentRow> | null>(null)
  const videoManageRef = useRef<VideoManageHandle | null>(null)

  useEffect(() => {
    if (status === "loading" || !lessonId) return
    const load = async () => {
      if (lessonId === "new") {
        if (!queryCourseId) {
          setLoading(false)
          return
        }
        // a tutor set gets its lessons from the tutor workspace
        const { data: target } = await supabase.from("courses_all").select("kind").eq("id", queryCourseId).maybeSingle()
        if (target?.kind === "tutor") {
          router.replace("/i/tutor/" + queryCourseId)
          return
        }
        const { data: existingLessons } = await supabase.from("lessons").select("id").eq("course_id", queryCourseId)
        const newId = "l_" + Date.now()
        const testDefaults = { required: false, passing_score: 50, time_limit: 30, attempts: "1", shuffle: true, show_answers: true, due: null, due_time: "23:59" }
        const { error } = await supabase.from("lessons").insert([
          {
            id: newId,
            course_id: queryCourseId,
            title: "บทเรียนใหม่",
            description: "",
            duration: "",
            status: "draft",
            index: existingLessons ? existingLessons.length + 1 : 1,
            video: false,
            pretest: testDefaults,
            posttest: testDefaults,
            assignment: null,
            watch_limit: false,
            allow_download: true,
            allow_ai: true,
            has_docs: true,
            has_pretest: true,
            has_posttest: true,
            has_assignment: true,
          },
        ])
        if (error) {
          toast.error("เกิดข้อผิดพลาดในการสร้างบทเรียน: " + error.message)
          setLoading(false)
        } else {
          router.replace(`/i/lesson/${newId}`)
        }
        return
      }

      const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single()
      if (!lData) {
        setLoading(false)
        return
      }

      // courses_all, not the `courses` view: the view hides tutor sets (course would be empty -> broken links).
      const { data: cData } = lData.course_id ? await supabase.from("courses_all").select("*").eq("id", lData.course_id).single() : { data: null }
      // tutor lessons are edited in the tutor workspace, never in the course lesson editor
      if (cData?.kind === "tutor") {
        router.replace("/i/tutor/" + cData.id + "?lesson=" + lessonId)
        return
      }

      const [qRes, aRes, rRes] = await Promise.all([
        supabase.from("questions").select("*").eq("lesson_id", lessonId).order("no", { ascending: true }),
        supabase.from("assignments").select("*").eq("lesson_id", lessonId),
        supabase.from("rubrics").select("*"),
      ])

      setLesson(lData)
      setCourse(cData || { code: "", title: "" })
      setData({ questions: qRes.data || [], assignments: aRes.data || [], rubrics: rRes.data || [] })
      setLoading(false)
    }
    load()
  }, [lessonId, queryCourseId, status, reloadKey, router])

  const isTabEnabled = (t: LessonTab) => {
    if (t === "video") return true
    if (t === "docs") return !!lesson?.has_docs
    if (t === "test") return !!(lesson?.has_pretest || lesson?.has_posttest)
    return !!lesson?.has_assignment
  }
  // A tab whose switch was turned off falls back to the video tab.
  const activeTab: LessonTab = isTabEnabled(tab) ? tab : "video"

  const handleSaveLessonDetails = async (updatedFields: LessonUpdate, silent = false) => {
    if (!lessonId || !lesson) return

    // A required pre/post-test (or publishing) needs at least one question.
    const hasPretestUpdate = Object.prototype.hasOwnProperty.call(updatedFields, "pretest")
    const hasPosttestUpdate = Object.prototype.hasOwnProperty.call(updatedFields, "posttest")
    const isPublishing = updatedFields.status === "active"
    const checks = [
      { touched: hasPretestUpdate, kind: "pre", label: "Pre-test", config: hasPretestUpdate ? updatedFields.pretest : lesson.pretest },
      { touched: hasPosttestUpdate, kind: "post", label: "Post-test", config: hasPosttestUpdate ? updatedFields.posttest : lesson.posttest },
    ] as const
    for (const c of checks) {
      if ((c.touched || isPublishing) && parseTestConfig(c.config).required && data.questions.filter((q) => q.kind === c.kind).length === 0) {
        if (!silent) toast.warning(`กรุณาเพิ่มข้อสอบ ${c.label} อย่างน้อย 1 ข้อ ก่อนเปิดใช้งาน (ตั้งค่าให้จำเป็น)`)
        return
      }
    }

    const wasDraft = lesson.title === "บทเรียนใหม่" || lesson.title === ""
    const { error } = await supabase.from("lessons").update(updatedFields).eq("id", lessonId)
    if (error) {
      if (!silent) toast.error("เกิดข้อผิดพลาดในการบันทึก: " + error.message)
      return
    }
    setLesson((prev) => (prev ? ({ ...prev, ...updatedFields } as LessonRow) : prev))
    if (!silent) toast.success(wasDraft ? "สร้างบทเรียนสำเร็จ" : "บันทึกรายละเอียดบทเรียนเรียบร้อยแล้ว")
  }

  // Auto-save the text fields when leaving the video tab (silent, no toast).
  const handleTabChange = async (value: string) => {
    const next = value as LessonTab
    if (!isTabEnabled(next)) {
      toast.info(tabItems.find((t) => t.key === next)?.hint ?? "")
      return
    }
    if (activeTab === "video" && next !== "video" && videoManageRef.current?.hasTitle()) {
      await handleSaveLessonDetails(videoManageRef.current.getSavePayload(), true)
    }
    setTab(next)
  }

  const handleDeleteLesson = async () => {
    if (!lesson) return
    const confirmed = await confirm({
      title: "ลบบทเรียน",
      message: `คุณต้องการลบบทเรียน "บทที่ ${lesson.index}: ${lesson.title}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`,
      danger: true,
      confirmText: "ลบบทเรียน",
      cancelText: "ยกเลิก",
    })
    if (!confirmed) return
    try {
      await deleteLessonCascade(lesson.id)
      toast.success("ลบบทเรียนเรียบร้อยแล้ว")
      router.replace(`/i/course/${course?.id}`)
    } catch (error: unknown) {
      console.error("Error deleting lesson:", error)
      toast.error("เกิดข้อผิดพลาดในการลบบทเรียน: " + errMsg(error))
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingState className="min-h-[60vh]" />
      </PageContainer>
    )
  }
  if (!lesson) {
    return (
      <PageContainer>
        <EmptyState title="ไม่พบบทเรียน" description="ไม่พบบทเรียนตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของบทเรียนนี้" className="min-h-[60vh]" />
      </PageContainer>
    )
  }

  const isTutor = course?.kind === "tutor"
  const tabItems: Array<{ key: LessonTab; title: string; icon: ReactNode; hint: string }> = [
    { key: "video", title: "วิดีโอ", icon: <VideoIcon />, hint: "" },
    { key: "docs", title: "เอกสารประกอบ", icon: <FolderIcon />, hint: 'เปิดใช้งานที่สวิตช์ "มีเอกสารประกอบการเรียน" ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)' },
    { key: "test", title: "ข้อสอบ Pre/Post", icon: <ClipboardListIcon />, hint: 'เปิดใช้งานที่สวิตช์ "มีข้อสอบ Pre-test" หรือ "Post-test" ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)' },
    { key: "assign", title: "ใบงาน + Rubric", icon: <FileTextIcon />, hint: 'เปิดใช้งานที่สวิตช์ "มีใบงาน" ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)' },
  ]
  const hasDisabledTab = tabItems.some((t) => !isTabEnabled(t.key))
  const patchLesson = (fields: Partial<LessonRow>) => setLesson((prev) => (prev ? ({ ...prev, ...fields } as LessonRow) : prev))

  return (
    <PageContainer>
      <PageHeader
        kicker={"แก้ไขบทเรียน · " + (course?.code || "")}
        title={lesson.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={lesson.status || "draft"} onValueChange={(v) => handleSaveLessonDetails({ status: v })}>
              <SelectTrigger aria-label="สถานะบทเรียน" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">เผยแพร่แล้ว</SelectItem>
                <SelectItem value="draft">ฉบับร่าง</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => router.push("/i/lesson/" + lesson.id + "/scores")}>
              <ChartColumnIcon />
              คะแนนนักศึกษา
            </Button>
            {isTutor && (
              <Button variant="outline" onClick={() => router.push("/i/lesson/" + lesson.id + "/bank")}>
                <ClipboardListIcon />
                คลังข้อสอบชุดติว
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push((isTutor ? "/s/tutor/lesson/" : "/s/lesson/") + lesson.id)}>
              <EyeIcon />
              ดูมุมมองนักศึกษา
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDeleteLesson}>
              <Trash2Icon />
              ลบบทเรียน
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <div className="overflow-x-auto">
          <TabsList>
            {tabItems.map((item) => {
              const enabled = isTabEnabled(item.key)
              return (
                <TabsTrigger key={item.key} value={item.key} title={enabled ? undefined : item.hint} aria-disabled={!enabled} aria-label={enabled ? item.title : `${item.title} (${item.hint})`} className={enabled ? undefined : "cursor-not-allowed opacity-50"}>
                  {item.icon}
                  {item.title}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
        {hasDisabledTab && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <InfoIcon className="size-3.5 text-primary" />
            แท็บที่ปิดอยู่สามารถเปิดใช้งานได้จากสวิตช์ &quot;การตั้งค่าการเข้าถึง&quot; ในแท็บวิดีโอ
          </p>
        )}

        {/* forceMount keeps unsaved edits when switching tabs */}
        <TabsContent value="video" forceMount className="data-[state=inactive]:hidden">
          <VideoManage ref={videoManageRef} lesson={lesson} onSave={handleSaveLessonDetails} onLessonChange={patchLesson} />
        </TabsContent>
        {lesson.has_docs && (
          <TabsContent value="docs" forceMount className="data-[state=inactive]:hidden">
            <DocsManage lesson={lesson} onSave={handleSaveLessonDetails} />
          </TabsContent>
        )}
        {(lesson.has_pretest || lesson.has_posttest) && (
          <TabsContent value="test" forceMount className="data-[state=inactive]:hidden">
            <TestBuilder lesson={lesson} questions={data.questions} onLoad={reload} onSaveSettings={handleSaveLessonDetails} />
          </TabsContent>
        )}
        {lesson.has_assignment && (
          <TabsContent value="assign" forceMount className="data-[state=inactive]:hidden">
            <AssignmentList
              assignments={data.assignments}
              onSelect={setActiveAssignment}
              onDelete={async (a) => {
                if (await deleteAssignment(a)) reload()
              }}
              onAdd={() => setActiveAssignment({})}
            />
          </TabsContent>
        )}
      </Tabs>

      {activeAssignment && (
        <AssignmentSheet
          key={activeAssignment.id ?? "new"}
          lesson={lesson}
          assignment={activeAssignment.id ? (activeAssignment as AssignmentRow) : null}
          rubric={activeAssignment.rubric_id ? data.rubrics.find((r) => r.id === activeAssignment.rubric_id) : null}
          onClose={() => setActiveAssignment(null)}
          onSaved={reload}
        />
      )}
    </PageContainer>
  )
}

export default function InstructorLesson() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <LoadingState className="min-h-[60vh]" />
        </PageContainer>
      }
    >
      <InstructorLessonContent />
    </Suspense>
  )
}
