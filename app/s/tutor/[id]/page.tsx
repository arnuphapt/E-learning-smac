"use client";

import { useParams } from "next/navigation";
import { PageContainer } from "@/components/common/page-container";
import { EmptyState, LoadingState } from "@/components/common/states";
import { SetHeader } from "@/components/student/tutor/set-header";
import { TutorLessonRow } from "@/components/student/tutor/tutor-lesson-row";
import { TutorNotFound } from "@/components/student/tutor/tutor-not-found";
import type { TutorSetResponse } from "@/components/student/tutor/types";
import { useTutorFetch } from "@/components/student/tutor/use-tutor-fetch";

// One tutor set: its lessons. Data from /api/tutor/sets/<id> (lock enforced there; never contains questions).
export default function StudentTutorSet() {
  const rawId = useParams()?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { data, missing } = useTutorFetch<TutorSetResponse>(id ? "/api/tutor/sets/" + encodeURIComponent(id) : null);

  if (missing) {
    return (
      <PageContainer>
        <TutorNotFound title="ไม่พบชุดติว" description="ไม่พบชุดติวนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ" />
      </PageContainer>
    );
  }
  if (!data) return <PageContainer><LoadingState /></PageContainer>;

  const { set, lessons } = data;
  return (
    <PageContainer>
      <SetHeader set={set} lessonCount={lessons.length} />
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-bold">บทเรียนทั้งหมด</h2>
        <span className="text-xs text-muted-foreground">{lessons.length} บทเรียน</span>
      </div>
      {lessons.length === 0 ? (
        <EmptyState title="ชุดติวนี้ยังไม่มีบทที่เปิดให้ใช้งาน" />
      ) : (
        <div className="flex flex-col gap-3">
          {lessons.map((l) => <TutorLessonRow key={l.id} lesson={l} />)}
        </div>
      )}
    </PageContainer>
  );
}
