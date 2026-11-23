"use client";

import { BookOpenIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { SetCard } from "@/components/student/tutor/set-card";
import type { TutorSetSummary } from "@/components/student/tutor/types";
import { useTutorFetch } from "@/components/student/tutor/use-tutor-fetch";

// Tutor sets this student may open. The list comes from /api/tutor/sets, which enforces the year / section lock.
export default function StudentTutorSets() {
  const { data, missing } = useTutorFetch<{ sets?: TutorSetSummary[] }>("/api/tutor/sets");

  if (missing) {
    return (
      <PageContainer>
        <ErrorState title="โหลดชุดติวไม่สำเร็จ" description="กรุณาลองใหม่อีกครั้ง" />
      </PageContainer>
    );
  }
  if (!data) return <PageContainer><LoadingState /></PageContainer>;

  const sets = data.sets || [];
  return (
    <PageContainer>
      <PageHeader title="ชุดติวของฉัน" description="ทบทวนเนื้อหาและฝึกทำข้อสอบเป็นชุดต่อบท แยกจากรายวิชาปกติ" />
      {sets.length === 0 ? (
        <EmptyState
          icon={<BookOpenIcon />}
          title="ยังไม่มีชุดติวสำหรับคุณ"
          description="เมื่ออาจารย์เปิดชุดติวให้ชั้นปีหรือกลุ่มเรียนของคุณ จะแสดงที่นี่"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((c) => <SetCard key={c.id} set={c} />)}
        </div>
      )}
    </PageContainer>
  );
}
