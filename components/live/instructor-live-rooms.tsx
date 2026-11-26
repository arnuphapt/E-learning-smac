"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PlayIcon, RadioIcon } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/states";
import { ToneBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenRoomDialog, type CourseOption } from "@/components/live/open-room-form";
import { endedRoomColumns, ongoingRoomColumns, type LiveSessionRow } from "@/components/live/room-columns";

type LiveQuizRow = Pick<Database["public"]["Tables"]["live_quizzes"]["Row"], "id" | "title" | "updated_at">;

interface SessionUserIds {
  id?: string;
  dbId?: string;
  sub?: string;
}

export function InstructorLiveRooms({
  hubId,
  legacyOnly = false,
}: {
  hubId?: string;
  legacyOnly?: boolean;
}) {
  const searchParams = useSearchParams();
  const preselectedQuizId = searchParams.get("quiz") || "";

  const { data: session, status: authStatus } = useSession();
  const sessionUser = session?.user as SessionUserIds | undefined;
  const userId = sessionUser?.id || sessionUser?.dbId || sessionUser?.sub;

  const [quizzes, setQuizzes] = useState<LiveQuizRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRoomManual, setOpenRoomManual] = useState(false);
  const [openRoomDismissed, setOpenRoomDismissed] = useState(false);

  const dialogOpen = openRoomManual || (Boolean(preselectedQuizId) && !openRoomDismissed);

  useEffect(() => {
    if (authStatus === "loading" || !userId) return;
    const uid = userId;

    async function loadData() {
      try {
        if (!legacyOnly) {
          const { data: qData } = await supabase
            .from("live_quizzes")
            .select("id, title, updated_at")
            .order("updated_at", { ascending: false });
          setQuizzes(qData || []);

          const { data: ciRows } = await supabase
            .from("course_instructors")
            .select("course_id")
            .eq("user_id", uid);

          const courseIds = (ciRows || []).map((r) => r.course_id);
          let cList: CourseOption[] = [];
          if (courseIds.length > 0) {
            const { data: cData } = await supabase
              .from("courses_all")
              .select("id, code, title")
              .in("id", courseIds)
              .order("code", { ascending: true });
            cList = cData || [];
          } else {
            const { data: cData } = await supabase
              .from("courses_all")
              .select("id, code, title")
              .limit(50);
            cList = cData || [];
          }
          setCourses(cList);
        }

        let sessionsQuery = supabase
          .from("live_sessions")
          .select("id, course_id, title, pin, phase, total, restrict_to_course, team_mode, created_at, ended_at")
          .eq("host_id", uid)
          .order("created_at", { ascending: false });

        if (hubId) {
          sessionsQuery = sessionsQuery.eq("hub_id", hubId);
        } else if (legacyOnly) {
          sessionsQuery = sessionsQuery.is("hub_id", null);
        }

        const { data: sData } = await sessionsQuery;
        setSessions(sData || []);
      } catch (err) {
        console.error("Failed to load live quiz host data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId, authStatus, hubId, legacyOnly]);

  const effectiveLoading = loading && (authStatus === "loading" || Boolean(userId));
  const ongoingSessions = sessions.filter((s) => s.phase !== "ended");
  const endedSessions = sessions.filter((s) => s.phase === "ended");

  if (legacyOnly && !effectiveLoading && sessions.length === 0) {
    return null;
  }

  const roomTables = (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{legacyOnly ? "ห้องที่กำลังเปิดอยู่ (ก่อนมี Hub)" : "ห้องที่กำลังเปิดอยู่"}</CardTitle>
          <ToneBadge tone="success">{ongoingSessions.length} ห้อง</ToneBadge>
        </CardHeader>
        <CardContent>
          <DataTable.Root data={ongoingSessions} columns={ongoingRoomColumns} getRowId={(r: LiveSessionRow) => r.id} searchKeys={["title", "pin"]}>
            <DataTable.Content
              loading={effectiveLoading}
              empty={
                <EmptyState
                  icon={<RadioIcon />}
                  title="ไม่มีห้องที่กำลังเปิดใช้งานอยู่ในขณะนี้"
                  description={legacyOnly ? undefined : "กด “เปิดห้องควิซใหม่” เพื่อเริ่มการแข่งขัน"}
                />
              }
            />
            <DataTable.Pagination />
          </DataTable.Root>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{legacyOnly ? "ประวัติห้องก่อนมี Hub" : "ประวัติห้องที่จบแล้ว"}</CardTitle>
          <span className="text-xs text-muted-foreground">{endedSessions.length} รายการ</span>
        </CardHeader>
        <CardContent>
          <DataTable.Root data={endedSessions} columns={endedRoomColumns} getRowId={(r: LiveSessionRow) => r.id} searchKeys={["title"]}>
            <DataTable.Content loading={effectiveLoading} empty={<EmptyState title="ยังไม่มีประวัติห้องควิซ" />} />
            <DataTable.Pagination />
          </DataTable.Root>
        </CardContent>
      </Card>
    </div>
  );

  if (legacyOnly) {
    return roomTables;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenRoomManual(true)}>
          <PlayIcon />
          เปิดห้องควิซใหม่
        </Button>
      </div>
      {roomTables}
      {dialogOpen && (
        <OpenRoomDialog
          quizzes={quizzes}
          courses={courses}
          preselectedQuizId={preselectedQuizId}
          hubId={hubId}
          onClose={() => {
            setOpenRoomManual(false);
            setOpenRoomDismissed(true);
          }}
        />
      )}
    </div>
  );
}
