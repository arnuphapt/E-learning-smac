"use client";

import { useParams } from "next/navigation";
import { AlertCircleIcon, CheckIcon, VideoIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { LessonTabs } from "@/components/student/lesson/lesson-tabs";
import { LessonVideo } from "@/components/student/lesson/lesson-video";
import { LockedNotice } from "@/components/student/lesson/locked-notice";
import { NoVideoStage } from "@/components/student/lesson/no-video-stage";
import { SideRail } from "@/components/student/lesson/side-rail";
import { deriveLessonState } from "@/components/student/lesson/lesson-state";
import { useLesson } from "@/components/student/lesson/use-lesson";
import { Button } from "@/components/ui/button";

export default function StudentLesson() {
  const rawId = useParams()?.id;
  const lessonId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { lesson, course, assignments, allLessons, testScore, submissions, questionCounts, watchProgress, updateProgress, studentId, loading } = useLesson(lessonId);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (!lesson) {
    return (
      <PageContainer>
        <EmptyState
          icon={<AlertCircleIcon />}
          title="ไม่พบบทเรียน"
          description="ไม่พบบทเรียนตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของบทเรียนนี้"
        />
      </PageContainer>
    );
  }

  const state = deriveLessonState(lesson, testScore, questionCounts);
  const { pre, gated, hasNoVideo } = state;

  if (gated && hasNoVideo) {
    return (
      <PageContainer>
        <LockedNotice variant="page" lessonId={lesson.id} pastDue={pre.pastDue} dueText={pre.dueText} preCount={questionCounts.pre} />
      </PageContainer>
    );
  }

  const finished = watchProgress === 100;
  return (
    <PageContainer>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {hasNoVideo ? (
            <NoVideoStage lesson={lesson} assignments={assignments} submissions={submissions} />
          ) : (
            <LessonVideo lesson={lesson} gated={gated} pastDue={pre.pastDue} dueText={pre.dueText} preCount={questionCounts.pre} onProgress={updateProgress} />
          )}
          <PageHeader
            className="mt-4"
            kicker={`บทที่ ${lesson.index} · ${course?.code ?? ""}`}
            title={lesson.title}
            description={
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="flex items-center gap-1"><VideoIcon className="size-3.5" />{lesson.duration}</span>
                <StatusBadge status={lesson.status} />
              </span>
            }
            actions={
              !gated && !hasNoVideo && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={finished}
                  className={finished ? "border-success bg-success-soft text-success disabled:opacity-100" : undefined}
                  onClick={() => updateProgress(100)}
                >
                  <CheckIcon />
                  {finished ? "เรียนจบแล้ว" : "ทำเครื่องหมายว่าเรียนจบ"}
                </Button>
              )
            }
          />
          <LessonTabs lesson={lesson} assignments={assignments} submissions={submissions} noVideo={hasNoVideo} />
        </div>
        <aside className="w-full lg:sticky lg:top-4 lg:w-[330px] lg:shrink-0">
          <SideRail lesson={lesson} state={state} assignments={assignments} submissions={submissions} allLessons={allLessons} watchProgress={watchProgress} studentId={studentId} />
        </aside>
      </div>
    </PageContainer>
  );
}
