"use client"

import { Suspense, useRef, useState, type ReactNode } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ChartColumnIcon, ClipboardListIcon, EyeIcon, FileTextIcon, FolderIcon, InfoIcon, Trash2Icon, VideoIcon } from "lucide-react"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDeleteAssignment } from "@/components/lesson/assignment-actions"
import { AssignmentList } from "@/components/lesson/assignment-list"
import { AssignmentSheet } from "@/components/lesson/assignment-sheet"
import { DocsManage } from "@/components/lesson/docs-manage"
import { TestBuilder } from "@/components/lesson/test-builder"
import type { AssignmentRow, LessonTab } from "@/components/lesson/types"
import { useLessonEditor } from "@/components/lesson/use-lesson-editor"
import { VideoManage, type VideoManageHandle } from "@/components/lesson/video-manage"

function InstructorLessonContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const deleteAssignment = useDeleteAssignment()

  const rawId = params?.id
  const lessonId = Array.isArray(rawId) ? rawId[0] : rawId
  const queryCourseId = searchParams.get("course_id")

  const [tab, setTab] = useState<LessonTab>("video")
  const [activeAssignment, setActiveAssignment] = useState<Partial<AssignmentRow> | null>(null)
  const videoManageRef = useRef<VideoManageHandle | null>(null)

  const { lesson, course, data, loading, isTutor, reload, patchLesson, saveDetails, deleteLesson, isTabEnabled } = useLessonEditor({
    lessonId,
    queryCourseId,
    redirectOnTutor: true,
  })

  // A tab whose switch was turned off falls back to the video tab.
  const activeTab: LessonTab = isTabEnabled(tab) ? tab : "video"

  const tabItems: Array<{ key: LessonTab; title: string; icon: ReactNode; hint: string }> = [
    { key: "video", title: "วิดีโอ", icon: <VideoIcon />, hint: "" },
    { key: "docs", title: "เอกสารประกอบ", icon: <FolderIcon />, hint: 'เปิดใช้งานที่สวิตช์ "มีเอกสารประกอบการเรียน" ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)' },
    { key: "test", title: "ข้อสอบ Pre/Post", icon: <ClipboardListIcon />, hint: 'เปิดใช้งานที่สวิตช์ "มีข้อสอบ Pre-test" หรือ "Post-test" ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)' },
    { key: "assign", title: "ใบงาน + Rubric", icon: <FileTextIcon />, hint: 'เปิดใช้งานที่สวิตช์ "มีใบงาน" ในการตั้งค่าการเข้าถึง (แท็บวิดีโอ)' },
  ]

  // Auto-save the text fields when leaving the video tab (silent, no toast).
  const handleTabChange = async (value: string) => {
    const next = value as LessonTab
    if (!isTabEnabled(next)) {
      toast.info(tabItems.find((t) => t.key === next)?.hint ?? "")
      return
    }
    if (activeTab === "video" && next !== "video" && videoManageRef.current?.hasTitle()) {
      await saveDetails(videoManageRef.current.getSavePayload(), true)
    }
    setTab(next)
  }

  const handleDeleteLesson = async () => {
    if (await deleteLesson()) {
      router.replace(`/i/course/${course?.id}`)
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

  const hasDisabledTab = tabItems.some((t) => !isTabEnabled(t.key))

  return (
    <PageContainer>
      <PageHeader
        kicker={"แก้ไขบทเรียน · " + (course?.code || "")}
        title={lesson.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={lesson.status || "draft"} onValueChange={(v) => saveDetails({ status: v })}>
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
          <VideoManage ref={videoManageRef} lesson={lesson} onSave={saveDetails} onLessonChange={patchLesson} />
        </TabsContent>
        {lesson.has_docs && (
          <TabsContent value="docs" forceMount className="data-[state=inactive]:hidden">
            <DocsManage lesson={lesson} onSave={saveDetails} />
          </TabsContent>
        )}
        {(lesson.has_pretest || lesson.has_posttest) && (
          <TabsContent value="test" forceMount className="data-[state=inactive]:hidden">
            <TestBuilder lesson={lesson} questions={data.questions} onLoad={reload} onSaveSettings={saveDetails} />
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
