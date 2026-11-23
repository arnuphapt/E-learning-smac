"use client";

import { useParams } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { LoadingState } from "@/components/common/states";
import { ExamHeader } from "@/components/student/tutor/exam-header";
import { ExamIntro } from "@/components/student/tutor/exam-intro";
import { ExamRunning } from "@/components/student/tutor/exam-running";
import { ExamSubmitted } from "@/components/student/tutor/exam-submitted";
import { TutorNotFound } from "@/components/student/tutor/tutor-not-found";
import { useTutorExam } from "@/components/student/tutor/use-tutor-exam";

// Tutor exam of one lesson; the round logic (server clock, answer saving, submit) is in use-tutor-exam.
export default function StudentTutorExam() {
  const rawId = useParams()?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const t = useTutorExam(id);
  const { info, pre, exam, result } = t;

  if (t.missing) {
    return (
      <PageContainer>
        <TutorNotFound title="ไม่พบข้อสอบ" description="ไม่พบบทเรียนนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ" />
      </PageContainer>
    );
  }
  if (t.empty) {
    return (
      <PageContainer>
        <TutorNotFound
          icon={<AlertCircleIcon />}
          title="ข้อสอบรอบนี้ใช้งานไม่ได้"
          description="ข้อสอบของบทนี้ถูกอาจารย์แก้ไขหรือลบ กรุณากลับมาทำใหม่ภายหลัง"
        />
      </PageContainer>
    );
  }
  if (!info || (!pre && !exam)) return <PageContainer><LoadingState /></PageContainer>;

  if (!exam) {
    if (!pre) return null;
    return (
      <PageContainer>
        <ExamIntro info={info} pre={pre} notice={t.notice} busy={t.busy} onStart={t.start} />
      </PageContainer>
    );
  }
  if (result) {
    return (
      <PageContainer>
        <ExamSubmitted info={info} result={result} attemptId={exam.attempt.id} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-6xl">
      <ExamHeader info={info} remaining={t.remaining} timeUp={t.timeUp} submitting={t.submitting} onSubmit={() => t.submit(true)} />
      <ExamRunning
        exam={exam}
        timeUp={t.timeUp}
        saveError={t.saveError}
        submitError={t.submitError}
        submitting={t.submitting}
        onChoose={t.choose}
        onGo={t.go}
        onRetrySubmit={() => t.submit(false)}
      />
    </PageContainer>
  );
}
