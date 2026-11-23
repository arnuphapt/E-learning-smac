"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpenIcon, PlayIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { AiSummaryCard } from "@/components/student/tutor/ai-summary-card";
import { ResultSummary } from "@/components/student/tutor/result-summary";
import { ReviewItem } from "@/components/student/tutor/review-item";
import { ReviewTopicsCard } from "@/components/student/tutor/review-topics-card";
import { RoundsCard } from "@/components/student/tutor/rounds-card";
import { TopicResults } from "@/components/student/tutor/topic-results";
import { TutorNotFound } from "@/components/student/tutor/tutor-not-found";
import { useTutorResult } from "@/components/student/tutor/use-tutor-result";
import { cn } from "@/lib/utils";

// Result of a tutor lesson: score, per-topic bars + badges, topics to review with reasons, per-question review.
// Everything shown was computed by the server when the round ended; this page only draws it (see use-tutor-result).
export default function StudentTutorResult() {
  const rawId = useParams()?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { info, data, view, switching, load } = useTutorResult(id);

  if (view === "missing") {
    return (
      <PageContainer>
        <TutorNotFound title="ไม่พบผลการทำข้อสอบ" description="ไม่พบผลนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ" />
      </PageContainer>
    );
  }
  if (view === "running") {
    return (
      <PageContainer>
        <TutorNotFound
          title="รอบนี้ยังทำไม่เสร็จ"
          description="ผลและเฉลยจะแสดงหลังส่งคำตอบหรือหมดเวลาเท่านั้น"
          href={"/s/tutor/lesson/" + id + "/exam"}
          action="กลับไปทำข้อสอบต่อ"
        />
      </PageContainer>
    );
  }
  if (!info || view === "loading") return <PageContainer><LoadingState /></PageContainer>;

  if (view === "none") {
    return (
      <PageContainer>
        <EmptyState
          icon={<BookOpenIcon />}
          title="ยังไม่มีผลการทำข้อสอบ"
          description="ทำข้อสอบบทนี้และส่งคำตอบ แล้วผลวิเคราะห์จะแสดงที่นี่"
          action={
            <Button asChild size="sm">
              <Link href={"/s/tutor/lesson/" + info.lesson.id + "/exam"}>
                <PlayIcon />
                ทำข้อสอบ
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (!data) return null;
  const { attempt, bestId, rounds, analysis, review } = data;
  return (
    <PageContainer className={cn("max-w-5xl transition-opacity", switching && "opacity-60")}>
      <ResultSummary info={info} data={data} onLoad={load} />
      {rounds.length > 1 && <RoundsCard rounds={rounds} currentId={attempt.id} bestId={bestId} switching={switching} onLoad={load} />}
      <TopicResults groups={analysis.groups} />
      <AiSummaryCard key={attempt.id} attemptId={attempt.id} initial={data.summary} />
      <ReviewTopicsCard items={analysis.review} />
      <h2 className="mb-3 px-1 text-lg font-bold">ทบทวนรายข้อ</h2>
      {review.map((r) => <ReviewItem key={r.questionId} r={r} attemptId={attempt.id} />)}
    </PageContainer>
  );
}
