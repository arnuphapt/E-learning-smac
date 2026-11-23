"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2Icon, ChevronRightIcon, ClipboardListIcon, FileTextIcon, PlayCircleIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChecklistItem, type ChecklistTone } from "./checklist-item"
import type { deriveLessonState } from "./lesson-state"
import type { AssignmentRow, LessonRow, SubmissionRow } from "./types"

const chevron = <ChevronRightIcon className="size-4 text-muted-foreground" />

/** "Lesson progress": pre-test, video, each assignment and post-test as a checklist. Renders nothing when the lesson has none of them. */
export function ProgressCard({
  lesson,
  state,
  assignments,
  submissions,
  watchProgress,
}: {
  lesson: LessonRow
  state: ReturnType<typeof deriveLessonState>
  assignments: AssignmentRow[]
  submissions: SubmissionRow[]
  watchProgress: number
}) {
  const router = useRouter()
  const { pre, post, gated, hasNoVideo } = state
  const showPre = lesson.has_pretest && pre.required
  const showPost = lesson.has_posttest && post.required
  const showAssign = lesson.has_assignment && assignments.length > 0
  if (!showPre && hasNoVideo && !showAssign && !showPost) return null

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-0 py-3">
        <CardTitle className="text-base">ความคืบหน้าบทเรียน</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {showPre && (
          <ChecklistItem
            icon={pre.taken ? CheckCircle2Icon : ClipboardListIcon}
            tone={pre.taken ? "done" : pre.pastDue ? "locked" : "current"}
            label="Pre-test"
            sub={pre.taken ? `ทำแล้ว · ${pre.score}/${pre.total} คะแนน` : pre.pastDue ? `เลยกำหนดส่งเมื่อ ${pre.dueText}` : "ต้องทำก่อนเข้าเรียน"}
            onClick={() =>
              pre.pastDue
                ? toast("เลยกำหนดเวลาทำแบบทดสอบก่อนเรียนแล้ว")
                : router.push(pre.taken ? "/s/test/" + lesson.id + "/pre/result" : "/s/test/" + lesson.id + "/pre")
            }
            action={chevron}
          />
        )}
        {!hasNoVideo && (
          <ChecklistItem
            icon={watchProgress === 100 ? CheckCircle2Icon : PlayCircleIcon}
            tone={gated ? "locked" : watchProgress === 100 ? "done" : "current"}
            label="วิดีโอบทเรียน"
            sub={gated ? "ปลดล็อกหลังทำ Pre-test" : `ดูแล้ว ${watchProgress}%`}
          />
        )}
        {showAssign &&
          assignments.map((a) => {
            const sub = submissions.find((s) => s.assignment_id === a.id)
            const status = sub ? sub.status : "not-submitted"
            const tone: ChecklistTone = status === "graded" ? "done" : status === "submitted" ? "current" : "todo"
            const subText = status === "graded" ? `ตรวจแล้ว · ${sub?.score}/${sub?.total}` : status === "submitted" ? "ส่งแล้ว · รอตรวจ" : "ยังไม่ส่ง"
            return (
              <ChecklistItem key={a.id} icon={FileTextIcon} tone={tone} label={a.title} sub={subText} onClick={() => router.push("/s/assignment/" + a.id)} action={chevron} />
            )
          })}
        {showPost && (
          <ChecklistItem
            icon={post.taken ? CheckCircle2Icon : ClipboardListIcon}
            tone={post.taken ? "done" : post.pastDue || gated ? "locked" : "todo"}
            label="Post-test"
            sub={post.taken ? `ทำแล้ว · ${post.score}/${post.total}` : post.pastDue ? `เลยกำหนดส่งเมื่อ ${post.dueText}` : gated ? "ปลดล็อกหลังเรียนจบ" : "พร้อมให้ทำแล้ว"}
            onClick={() => {
              if (post.pastDue) toast("เลยกำหนดเวลาทำแบบทดสอบหลังเรียนแล้ว")
              else if (!gated) router.push(post.taken ? "/s/test/" + lesson.id + "/post/result" : "/s/test/" + lesson.id + "/post")
            }}
            action={!gated && !post.taken && !post.pastDue ? <Badge variant="secondary">ทำเลย</Badge> : chevron}
          />
        )}
      </CardContent>
    </Card>
  )
}
