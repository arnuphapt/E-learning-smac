"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon, FlagIcon, XIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, LoadingState } from "@/components/common/states";
import { QuestionCard } from "@/components/student/test/question-card";
import { QuestionPalette } from "@/components/student/test/question-palette";
import { SubmitDialog } from "@/components/student/test/submit-dialog";
import { TestNotice } from "@/components/student/test/test-notice";
import { useTestTaking } from "@/components/student/test/use-test-taking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function TestTaking() {
  const params = useParams();
  const rawId = params?.id;
  const lessonId = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawKind = params?.kind;
  const kind = (Array.isArray(rawKind) ? rawKind[0] : rawKind) || "pre"; // pre | post

  const t = useTestTaking(lessonId, kind);
  const { lesson, qs, cur, answers, flagged } = t;

  if (t.loading) return <PageContainer><LoadingState label="กำลังโหลดข้อสอบ..." /></PageContainer>;
  if (!lesson || qs.length === 0) return <PageContainer><EmptyState title="ไม่พบข้อสอบ" /></PageContainer>;
  if (t.pastDue) {
    return (
      <PageContainer>
        <TestNotice
          tone="danger"
          lessonId={lesson.id}
          title="เลยกำหนดเวลาทำข้อสอบแล้ว"
          description={`แบบทดสอบนี้ได้ปิดระบบแล้วเมื่อ ${t.dueText} คุณจึงไม่สามารถเข้าทำข้อสอบหรือส่งคำตอบได้อีกต่อไป`}
        />
      </PageContainer>
    );
  }
  if (t.blockedByAttempts) {
    return (
      <PageContainer>
        <TestNotice
          tone="warning"
          lessonId={lesson.id}
          title="ไม่อนุญาตให้ทำแบบทดสอบเพิ่ม"
          description="คุณได้ทำแบบทดสอบนี้ไปแล้ว และบทเรียนนี้กำหนดให้ทำแบบทดสอบได้เพียง 1 ครั้งเท่านั้น"
        />
      </PageContainer>
    );
  }

  const q = qs[cur];
  const qId = q.id || "";
  const answered = Object.keys(answers).length;

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        kicker={kind === "pre" ? "แบบทดสอบก่อนเรียน (Pre-test)" : "แบบทดสอบหลังเรียน (Post-test)"}
        title={`บทที่ ${lesson.index} · ${lesson.title}`}
        actions={
          <>
            <Badge variant="secondary" className="h-8 gap-1.5 text-sm tabular-nums" role="timer" aria-label="เวลาที่เหลือ">
              <ClockIcon className="size-3.5" />
              {formatTime(t.timeLeft)}
            </Badge>
            <Button className="hidden md:inline-flex" onClick={() => t.setConfirmOpen(true)}>ส่งคำตอบ</Button>
            <Button asChild variant="ghost" size="icon" aria-label="ออกจากแบบทดสอบ">
              <Link href={"/s/lesson/" + lesson.id}><XIcon /></Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="w-full min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">ข้อ <b className="text-foreground">{cur + 1}</b> จาก {qs.length}</div>
            <Button variant={flagged[qId] ? "secondary" : "ghost"} size="sm" onClick={() => t.toggleFlag(qId)}>
              <FlagIcon />
              {flagged[qId] ? "ทำเครื่องหมายแล้ว" : "ทำเครื่องหมายไว้"}
            </Button>
          </div>
          <Progress className="mb-5 h-1.5" value={((cur + 1) / qs.length) * 100} aria-label="ความคืบหน้าของข้อสอบ" />

          <QuestionCard question={q} answer={answers[qId]} onChoose={(cid) => t.choose(qId, cid)} />

          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={cur === 0} onClick={() => t.setCur((c) => c - 1)}><ArrowLeftIcon />ก่อนหน้า</Button>
            {cur < qs.length - 1
              ? <Button onClick={() => t.setCur((c) => c + 1)}>ข้อถัดไป<ArrowRightIcon /></Button>
              : <Button onClick={() => t.setConfirmOpen(true)}><CheckIcon />ส่งคำตอบ</Button>}
          </div>
        </div>

        <QuestionPalette questions={qs} answers={answers} flagged={flagged} current={cur} onJump={t.setCur} onSubmit={() => t.setConfirmOpen(true)} />
      </div>

      <SubmitDialog open={t.confirmOpen} onOpenChange={t.setConfirmOpen} answered={answered} total={qs.length} onSubmit={() => t.submit()} />
    </PageContainer>
  );
}
