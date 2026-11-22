"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, FileSpreadsheetIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportResultsExcel, formatResultDate, type LiveResultsData } from "@/components/live/results-data";
import { playerColumns, questionColumns, teamColumns } from "@/components/live/results-columns";

function getErrorField(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "error" in data) {
    const errVal = (data as { error: unknown }).error;
    return typeof errVal === "string" ? errVal : undefined;
  }
  return undefined;
}

export default function LiveQuizResultsPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LiveResultsData | null>(null);

  useEffect(() => {
    if (!id) return;

    let ignore = false;
    async function fetchResults() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/live/${id}/results`);
        if (!res.ok) {
          if (res.status === 409) {
            throw new Error("ห้องนี้ยังไม่สิ้นสุดการแข่งขัน ไม่สามารถดูผลสรุปได้");
          }
          if (res.status === 403) {
            throw new Error("คุณไม่มีสิทธิ์เข้าถึงผลการแข่งขันของห้องนี้ (เฉพาะผู้สร้างห้องหรือผู้สอน)");
          }
          if (res.status === 404) {
            throw new Error("ไม่พบห้องควิซนี้ในระบบ");
          }
          const errData: unknown = await res.json().catch(() => ({}));
          throw new Error(getErrorField(errData) || `เกิดข้อผิดพลาด (${res.status})`);
        }
        const json = (await res.json()) as LiveResultsData;
        if (!ignore) {
          setData(json);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : "";
          setError(message || "ไม่สามารถโหลดข้อมูลผลการแข่งขันได้");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchResults();
    return () => {
      ignore = true;
    };
  }, [id]);

  const session = data?.session;
  const players = useMemo(() => data?.players ?? [], [data]);
  const teams = useMemo(() => data?.teams ?? [], [data]);
  const questions = useMemo(() => data?.questions ?? [], [data]);
  const isTeamMode = !!session?.team_mode;
  const totalQuestions = session?.total || 0;
  const pColumns = useMemo(() => playerColumns(isTeamMode, totalQuestions), [isTeamMode, totalQuestions]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState label="กำลังโหลดข้อมูลผลการแข่งขัน…" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState title="ไม่สามารถแสดงผลการแข่งขันได้" description={error} />
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/i/live">
              <ArrowLeftIcon />
              กลับหน้ารายการห้อง
            </Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={session?.title || "ผลการแข่งขันควิซสด"}
        description={`จบเมื่อ: ${formatResultDate(session?.ended_at)} · จำนวน ${totalQuestions} ข้อ · โหมด: ${
          isTeamMode ? "แบบทีม" : "แบบเดี่ยว"
        } · ผู้เล่น ${players.length} คน`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/i/live">
                <ArrowLeftIcon />
                กลับหน้ารายการห้อง
              </Link>
            </Button>
            <Button variant="outline" onClick={() => data && exportResultsExcel(data)}>
              <FileSpreadsheetIcon />
              ส่งออก Excel
            </Button>
          </>
        }
      />

      <Tabs defaultValue="players">
        <TabsList>
          <TabsTrigger value="players">รายคน ({players.length})</TabsTrigger>
          {isTeamMode && <TabsTrigger value="teams">รายทีม ({teams.length})</TabsTrigger>}
          <TabsTrigger value="questions">รายข้อ ({questions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <DataTable.Root data={players} columns={pColumns} getRowId={(r: { userId: string }) => r.userId} searchKeys={["name", "team"]} pageSize={25}>
            <DataTable.Toolbar>
              <DataTable.Search placeholder="ค้นหาชื่อผู้เล่น" />
            </DataTable.Toolbar>
            <DataTable.Content empty={<EmptyState title="ไม่มีผู้เล่นในห้องนี้" />} />
            <DataTable.Pagination />
          </DataTable.Root>
        </TabsContent>

        {isTeamMode && (
          <TabsContent value="teams">
            <DataTable.Root data={teams} columns={teamColumns} getRowId={(r: { name: string }) => r.name}>
              <DataTable.Content empty={<EmptyState title="ไม่มีข้อมูลคะแนนทีม" />} />
              <DataTable.Pagination />
            </DataTable.Root>
          </TabsContent>
        )}

        <TabsContent value="questions">
          <DataTable.Root data={questions} columns={questionColumns} getRowId={(r: { idx: number }) => String(r.idx)} searchKeys={["text"]} pageSize={25}>
            <DataTable.Content empty={<EmptyState title="ไม่มีคำถามในห้องนี้" />} />
            <DataTable.Pagination />
          </DataTable.Root>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
