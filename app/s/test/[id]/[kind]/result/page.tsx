"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, PlayCircleIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { EmptyState, LoadingState } from "@/components/common/states";
import { parseTestConfig } from "@/components/student/lesson/types";
import { AnswerReview } from "@/components/student/test/answer-review";
import { ResultSummary } from "@/components/student/test/result-summary";
import { useTestResult } from "@/components/student/test/use-test-result";
import { Button } from "@/components/ui/button";

export default function TestResult() {
  const params = useParams();
  const rawId = params?.id;
  const lessonId = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawKind = params?.kind;
  const kind = (Array.isArray(rawKind) ? rawKind[0] : rawKind) || "pre";

  const { lesson, questions, testScore, loading } = useTestResult(lessonId, kind);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (!lesson) return <PageContainer><EmptyState title="ไม่พบข้อมูลบทเรียน" /></PageContainer>;

  const total = questions.length || 10;
  const preScore = testScore?.pre ?? Math.round(total * 0.7);
  const postScore = testScore?.post ?? Math.round(total * 0.9);
  const score = kind === "pre" ? preScore : postScore;
  const showAnswers = parseTestConfig(kind === "pre" ? lesson.pretest : lesson.posttest)?.show_answers !== false;

  return (
    <PageContainer className="max-w-4xl">
      <ResultSummary kind={kind} lesson={lesson} total={total} score={score} preScore={preScore} postScore={postScore} />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">เฉลยและคำอธิบาย</h2>
        <span className="text-xs text-muted-foreground">{questions.length} ข้อ</span>
      </div>
      <AnswerReview questions={questions} correct={score} showAnswers={showAnswers} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={"/s/lesson/" + lesson.id}><ArrowLeftIcon />กลับสู่บทเรียน</Link>
        </Button>
        {kind === "pre" ? (
          <Button asChild size="lg">
            <Link href={"/s/lesson/" + lesson.id}><PlayCircleIcon />เริ่มชมวิดีโอบทเรียน</Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={"/s/course/" + lesson.course_id}>ไปบทเรียนถัดไป<ArrowRightIcon /></Link>
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
