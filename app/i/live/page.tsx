"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LibraryBigIcon, RadioIcon } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ToneBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenRoomForm, type CourseOption } from "@/components/live/open-room-form";
import { endedRoomColumns, ongoingRoomColumns, type LiveSessionRow } from "@/components/live/room-columns";

type LiveQuizRow = Pick<Database["public"]["Tables"]["live_quizzes"]["Row"], "id" | "title" | "updated_at">;

interface SessionUserIds {
  id?: string;
  dbId?: string;
  sub?: string;
}

function LiveRoomsContent() {
  const searchParams = useSearchParams();
  const preselectedQuizId = searchParams.get("quiz") || "";

  const { data: session, status: authStatus } = useSession();
  const sessionUser = session?.user as SessionUserIds | undefined;
  const userId = sessionUser?.id || sessionUser?.dbId || sessionUser?.sub;

  const [quizzes, setQuizzes] = useState<LiveQuizRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!userId) {
      setLoading(false);
      return;
    }
    const uid = userId;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Load quizzes owned by instructor
        const { data: qData } = await supabase
          .from("live_quizzes")
          .select("id, title, updated_at")
          .order("updated_at", { ascending: false });
        setQuizzes(qData || []);

        // 2. Load courses taught by instructor
        const { data: ciRows } = await supabase
          .from("course_instructors")
          .select("course_id")
          .eq("user_id", uid);

        const courseIds = (ciRows || []).map((r) => r.course_id);
        let cList: CourseOption[] = [];
        if (courseIds.length > 0) {
          const { data: cData } = await supabase
            .from("courses_all")
            .select('id, code, title')
            .in("id", courseIds)
            .order("code", { ascending: true });
          cList = cData || [];
        } else {
          // Fallback or admin
          const { data: cData } = await supabase
            .from("courses_all")
            .select('id, code, title')
            .limit(50);
          cList = cData || [];
        }
        setCourses(cList);

        // 3. Load live sessions hosted by instructor
        const { data: sData } = await supabase
          .from("live_sessions")
          .select("id, course_id, title, pin, phase, total, restrict_to_course, team_mode, created_at, ended_at")
          .eq("host_id", uid)
          .order("created_at", { ascending: false });
        setSessions(sData || []);
      } catch (err) {
        console.error("Failed to load live quiz host data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId, authStatus]);

  const ongoingSessions = sessions.filter((s) => s.phase !== "ended");
  const endedSessions = sessions.filter((s) => s.phase === "ended");

  return (
    <PageContainer>
      <PageHeader
        title="ควิซสดในห้องเรียน"
        description="เปิดห้องแข่งขันตอบคำถามแบบเรียลไทม์ผ่านจอโปรเจกเตอร์"
        actions={
          <Button asChild variant="outline">
            <Link href="/i/live/quizzes">
              <LibraryBigIcon />
              คลังชุดควิซของฉัน
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <OpenRoomForm quizzes={quizzes} courses={courses} preselectedQuizId={preselectedQuizId} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>ห้องที่กำลังเปิดอยู่</CardTitle>
              <ToneBadge tone="success">{ongoingSessions.length} ห้อง</ToneBadge>
            </CardHeader>
            <CardContent>
              <DataTable.Root data={ongoingSessions} columns={ongoingRoomColumns} getRowId={(r: LiveSessionRow) => r.id} searchKeys={["title", "pin"]}>
                <DataTable.Content
                  loading={loading}
                  empty={
                    <EmptyState
                      icon={<RadioIcon />}
                      title="ไม่มีห้องที่กำลังเปิดใช้งานอยู่ในขณะนี้"
                      description="เปิดห้องควิซใหม่จากแบบฟอร์มเพื่อเริ่มการแข่งขัน"
                    />
                  }
                />
                <DataTable.Pagination />
              </DataTable.Root>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>ประวัติห้องที่จบแล้ว</CardTitle>
              <span className="text-xs text-muted-foreground">{endedSessions.length} รายการ</span>
            </CardHeader>
            <CardContent>
              <DataTable.Root data={endedSessions} columns={endedRoomColumns} getRowId={(r: LiveSessionRow) => r.id} searchKeys={["title"]}>
                <DataTable.Content loading={loading} empty={<EmptyState title="ยังไม่มีประวัติห้องควิซ" />} />
                <DataTable.Pagination />
              </DataTable.Root>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

export default function InstructorLivePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LiveRoomsContent />
    </Suspense>
  );
}
