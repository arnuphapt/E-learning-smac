"use client";

import { useParams } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { getAttachmentList, getCriteriaList } from "@/components/student/assignment/files";
import { GradedCard } from "@/components/student/assignment/graded-card";
import { AttachmentsCard, InstructionsCard, RubricPreviewCard } from "@/components/student/assignment/info-cards";
import { StatusCard } from "@/components/student/assignment/status-card";
import { SubmitCard } from "@/components/student/assignment/submit-card";
import { useAssignmentDetail } from "@/components/student/assignment/use-assignment-detail";

export default function AssignmentDetail() {
  const rawId = useParams()?.id;
  const d = useAssignmentDetail(Array.isArray(rawId) ? rawId[0] : rawId);
  const { a, course, rubric, status } = d;

  if (d.loading) return <PageContainer><LoadingState /></PageContainer>;
  if (!a) {
    return (
      <PageContainer>
        <EmptyState
          icon={<AlertCircleIcon />}
          title="ไม่พบใบงาน"
          description="ไม่พบใบงานตามรหัสที่ระบุ หรือข้อมูลใบงานนี้ไม่มีอยู่ในระบบ"
        />
      </PageContainer>
    );
  }

  const attachments = getAttachmentList(a.attachments);

  return (
    <PageContainer>
      <PageHeader kicker={"ใบงาน · " + (course?.code || "")} title={a.title} />
      <div className="flex flex-col items-stretch gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <InstructionsCard instructions={a.instructions} />
          {attachments.length > 0 && <AttachmentsCard attachments={attachments} />}
          {rubric && getCriteriaList(rubric).length > 0 && <RubricPreviewCard rubric={rubric} points={a.points} />}
          {status === "graded" ? (
            <GradedCard score={a.score} points={a.points} rubric={rubric} instructorName={course?.instructor} />
          ) : (
            <SubmitCard d={d} />
          )}
        </div>
        <div className="w-full lg:w-75 lg:shrink-0">
          <StatusCard status={status} due={a.due} dueShort={a.due_short} dueTime={a.due_time} points={a.points} score={a.score} />
        </div>
      </div>
    </PageContainer>
  );
}
