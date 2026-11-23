"use client";

import { useParams } from "next/navigation";
import { PageContainer } from "@/components/common/page-container";
import { LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LessonExamCard } from "@/components/student/tutor/lesson-exam-card";
import { TutorLessonVideo } from "@/components/student/tutor/lesson-video";
import { TutorNotFound } from "@/components/student/tutor/tutor-not-found";
import type { TutorLessonResponse } from "@/components/student/tutor/types";
import { useTutorFetch } from "@/components/student/tutor/use-tutor-fetch";

// A tutor lesson: video (R2 via /api/files, same <video> player as course lessons) and description.
// Data from /api/tutor/lessons/<id>; the exam is on ./exam.
export default function StudentTutorLesson() {
  const rawId = useParams()?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { data, missing } = useTutorFetch<TutorLessonResponse>(id ? "/api/tutor/lessons/" + encodeURIComponent(id) : null);

  if (missing) {
    return (
      <PageContainer>
        <TutorNotFound title="ไม่พบบทเรียน" description="ไม่พบบทเรียนนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ" />
      </PageContainer>
    );
  }
  if (!data) return <PageContainer><LoadingState /></PageContainer>;

  const { set, lesson } = data;
  return (
    <PageContainer className="max-w-5xl">
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Badge>{set.code}</Badge>
          <Badge variant="outline">บทที่ {lesson.index}</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
      </div>
      <TutorLessonVideo src={lesson.video_url} />
      <LessonExamCard lesson={lesson} />
      <Card>
        <CardContent>
          <h2 className="mb-2 font-bold">รายละเอียดบทเรียน</h2>
          <p className="whitespace-pre-line text-muted-foreground text-pretty">{lesson.description || "ไม่มีคำอธิบายบทเรียน"}</p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
