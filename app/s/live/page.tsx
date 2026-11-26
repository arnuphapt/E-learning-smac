"use client";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Separator } from "@/components/ui/separator";
import StudentQuizHistory from "@/components/live/student-quiz-history";
import { JoinPinForm } from "@/components/student/live/join-pin-form";

export default function StudentLiveIndexPage() {
  return (
    <PageContainer>
      <PageHeader
        kicker="กิจกรรมการเรียนรู้"
        title="รวมเกม"
        description="กรอก PIN เพื่อเข้าร่วมห้องควิซสดและตอบคำถามแข่งขันแบบเรียลไทม์"
      />
      <JoinPinForm />
      <Separator className="mb-6" />
      <StudentQuizHistory />
    </PageContainer>
  );
}
