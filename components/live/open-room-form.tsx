"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InfoIcon, Loader2Icon, PlayIcon } from "lucide-react";
import type { QuizProblem } from "@/lib/live";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface QuizOption {
  id: string;
  title: string;
}

export interface CourseOption {
  id: string;
  code: string | null;
  title: string | null;
}

interface CreateLiveResponse {
  error?: string;
  problems?: QuizProblem[];
  teamsCreated?: boolean;
  id?: string;
  pin?: string;
}

const TEAM_COUNTS = [2, 3, 4, 5, 6, 7, 8];

function RadioCard({ value, id, title, desc }: { value: string; id: string; title: ReactNode; desc?: ReactNode }) {
  return (
    <Label
      htmlFor={id}
      className="items-start gap-3 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-soft"
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {desc && <span className="text-xs text-muted-foreground">{desc}</span>}
      </div>
    </Label>
  );
}

export function OpenRoomForm({
  quizzes,
  courses,
  preselectedQuizId,
}: {
  quizzes: QuizOption[];
  courses: CourseOption[];
  preselectedQuizId: string;
}) {
  const router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState(preselectedQuizId);
  const [pickedCourse, setPickedCourse] = useState("");
  const [restrictToCourse, setRestrictToCourse] = useState(true);
  const [teamMode, setTeamMode] = useState(false);
  const [teamCount, setTeamCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [problems, setProblems] = useState<QuizProblem[]>([]);

  // Defaults to the first course until the instructor picks another.
  const selectedCourse = pickedCourse || courses[0]?.id || "";

  async function handleCreateSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setInfoNotice("");
    setProblems([]);

    if (!selectedQuiz) {
      setFormError("กรุณาเลือกชุดควิซ");
      return;
    }
    if (!selectedCourse) {
      setFormError("กรุณาเลือกรายวิชา");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: selectedQuiz,
          course_id: selectedCourse,
          restrict_to_course: restrictToCourse,
          team_mode: teamMode,
          team_count: teamMode ? Number(teamCount) : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as CreateLiveResponse;

      if (res.status === 422) {
        setFormError(data.error || "ชุดควิซไม่พร้อมใช้งาน");
        setProblems(data.problems || []);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        setFormError(data.error || "ไม่สามารถเปิดห้องได้");
        setSubmitting(false);
        return;
      }

      if (teamMode && data.teamsCreated === false) {
        setInfoNotice("ใช้ทีมเดิมของรายวิชา");
        setTimeout(() => {
          router.push(`/i/live/${data.id}`);
        }, 1200);
        return;
      }

      router.push(`/i/live/${data.id}`);
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">เปิดห้องควิซใหม่</CardTitle>
        <CardDescription>เลือกชุดคำถามและรายวิชาเพื่อรับ PIN เข้าห้อง</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateSession} className="flex flex-col gap-5">
          <FormField label="ชุดควิซ" htmlFor="live-quiz-select" required>
            {quizzes.length === 0 ? (
              <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
                ยังไม่มีชุดควิซ{" "}
                <Link href="/i/live/quizzes" className="font-semibold text-primary underline">
                  สร้างชุดควิซก่อน
                </Link>
              </div>
            ) : (
              <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                <SelectTrigger id="live-quiz-select" className="w-full">
                  <SelectValue placeholder="-- เลือกชุดควิซ --" />
                </SelectTrigger>
                <SelectContent>
                  {quizzes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField label="รายวิชาที่สอน" htmlFor="live-course-select" required>
            <Select value={selectedCourse} onValueChange={setPickedCourse}>
              <SelectTrigger id="live-course-select" className="w-full">
                <SelectValue placeholder="-- เลือกรายวิชา --" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code ? `${c.code} ${c.title}` : c.title || c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex flex-col gap-2">
            <Label id="live-play-mode-label">โหมดการเล่น</Label>
            <RadioGroup
              value={teamMode ? "team" : "solo"}
              onValueChange={(v) => setTeamMode(v === "team")}
              aria-labelledby="live-play-mode-label"
              className="grid-cols-2"
            >
              <RadioCard value="solo" id="live-mode-solo" title="เดี่ยว" />
              <RadioCard value="team" id="live-mode-team" title="ทีม" />
            </RadioGroup>

            {teamMode && (
              <div className="flex flex-col gap-1.5 rounded-md border bg-muted p-3">
                <Label htmlFor="live-team-count" className="text-xs">
                  จำนวนทีม (2–8 ทีม)
                </Label>
                <Select value={String(teamCount)} onValueChange={(v) => setTeamCount(Number(v))}>
                  <SelectTrigger id="live-team-count" size="sm" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_COUNTS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} ทีม
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">ใช้เฉพาะรายวิชาที่ยังไม่มีทีม ถ้ามีทีมแล้วระบบใช้ทีมเดิม</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label id="live-restrict-label">สิทธิ์การเข้าร่วมห้อง</Label>
            <RadioGroup
              value={restrictToCourse ? "course" : "any"}
              onValueChange={(v) => setRestrictToCourse(v === "course")}
              aria-labelledby="live-restrict-label"
              className="gap-2"
            >
              <RadioCard
                value="course"
                id="live-restrict-course"
                title="เฉพาะนักศึกษาในรายวิชานี้ (แนะนำ)"
                desc="ระบบจะตรวจสิทธิ์การลงทะเบียน ป้องกันคนนอกเข้าห้อง"
              />
              <RadioCard
                value="any"
                id="live-restrict-any"
                title="ทุกคนที่มี PIN"
                desc="นักศึกษาที่ล็อกอินระบบทุกคนสามารถกรอก PIN เพื่อเข้าร่วมได้"
              />
            </RadioGroup>
          </div>

          {formError && (
            <Alert variant="destructive">
              <AlertTitle>{formError}</AlertTitle>
              {problems.length > 0 && (
                <AlertDescription>
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    {problems.map((prob, idx) => (
                      <li key={idx}>
                        ข้อที่ {prob.index + 1}: {prob.reason}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              )}
            </Alert>
          )}

          {infoNotice && (
            <Alert className="border-info/30 bg-info-soft text-info">
              <InfoIcon />
              <AlertTitle>{infoNotice}</AlertTitle>
            </Alert>
          )}

          <Button type="submit" disabled={submitting || quizzes.length === 0} className="w-full">
            {submitting ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
            {submitting ? "กำลังเปิดห้อง…" : "เปิดห้องควิซ (สร้าง PIN)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
