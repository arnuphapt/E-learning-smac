"use client";

import { useEffect, useState } from "react";
import { HistoryIcon } from "lucide-react";
import { ColumnHeader, DataTable, type DataTableColumnDef } from "@/components/common/data-table";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface QuizHistoryItem {
  id: string;
  title: string;
  team?: string | null;
  endedAt: string | null;
  rank: number;
  playerCount: number;
  score: number;
}

function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "-";
  try {
    return new Date(isoStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

const columns: DataTableColumnDef[] = [
  {
    accessorKey: "title",
    header: ({ column }) => <ColumnHeader column={column} title="ชื่อห้อง / ควิซ" />,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <span className="font-semibold text-foreground">{row.original.title}</span>
        {row.original.team && <Badge variant="secondary">ทีม: {row.original.team}</Badge>}
      </div>
    ),
  },
  {
    accessorKey: "endedAt",
    header: ({ column }) => <ColumnHeader column={column} title="วันที่เล่น" />,
    cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.original.endedAt)}</span>,
  },
  {
    accessorKey: "rank",
    header: ({ column }) => <ColumnHeader column={column} title="อันดับ" />,
    cell: ({ row }) => (
      <Badge variant="secondary">
        อันดับ {row.original.rank} / {row.original.playerCount} คน
      </Badge>
    ),
  },
  {
    accessorKey: "score",
    header: ({ column }) => <ColumnHeader column={column} title="คะแนนที่ได้" />,
    cell: ({ row }) => <span className="font-bold text-foreground tabular-nums">{row.original.score.toLocaleString()}</span>,
  },
];

export default function StudentQuizHistory() {
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/live/history");
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดประวัติการเล่นควิซสดได้");
        }
        const data: unknown = await res.json();
        if (!ignore) {
          setHistory(Array.isArray(data) ? (data as QuizHistoryItem[]) : []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError((err instanceof Error ? err.message : null) || "เกิดข้อผิดพลาด");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="mt-8 w-full">
      <Separator className="mb-6" />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-foreground">ประวัติควิซสดของฉัน</h2>
        {history.length > 0 && <span className="text-xs text-muted-foreground">ทั้งหมด {history.length} ครั้ง</span>}
      </div>

      {error ? (
        <ErrorState description={error} />
      ) : (
        <DataTable.Root data={history} columns={columns} getRowId={(r: QuizHistoryItem) => r.id} searchKeys={["title", "team"]}>
          <DataTable.Content
            loading={loading}
            empty={
              <EmptyState
                icon={<HistoryIcon />}
                title="ยังไม่มีประวัติการเล่นควิซสด"
                description="เมื่อจบเกมควิซสดในห้องเรียน ประวัติและคะแนนจะปรากฏที่นี่"
              />
            }
          />
          <DataTable.Pagination />
        </DataTable.Root>
      )}
    </section>
  );
}
