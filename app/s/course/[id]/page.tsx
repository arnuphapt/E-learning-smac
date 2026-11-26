"use client";

import { useParams } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { EmptyState, LoadingState } from "@/components/common/states";
import { CourseHero } from "@/components/student/course/course-hero";
import { LessonRow } from "@/components/student/course/lesson-row";
import { asTestObj, useCourseDetail } from "@/components/student/course/use-course-detail";

export default function StudentCourse() {
  const rawId = useParams()?.id;
  const { course, lessons, loading } = useCourseDetail(Array.isArray(rawId) ? rawId[0] : rawId);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (!course) {
    return (
      <PageContainer>
        <EmptyState
          icon={<AlertCircleIcon />}
          title="ไม่พบข้อมูลรายวิชา"
          description="ไม่พบข้อมูลรายวิชาตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของระบบ"
        />
      </PageContainer>
    );
  }

  // A lesson counts as finished when its required post-test is taken, else when progress is 100.
  const completed = lessons.filter((l) => {
    const post = asTestObj(l.posttest);
    return post?.required ? post.taken : l.progress === 100;
  }).length;
  const progress = lessons.length > 0 ? Math.round(lessons.reduce((acc, l) => acc + (l.progress || 0), 0) / lessons.length) : 0;

  return (
    <PageContainer>
      <CourseHero course={course} lessonCount={lessons.length} completed={completed} progress={progress} />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">บทเรียนทั้งหมด</h2>
        <span className="text-xs text-muted-foreground">เรียงตามลำดับบทเรียน</span>
      </div>
      <div className="flex flex-col gap-3">
        {lessons.map((l) => <LessonRow key={l.id} lesson={l} />)}
      </div>
    </PageContainer>
  );
}
