"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRightIcon, InfoIcon, LayersIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { ColumnHeader, DataTable, type DataTableColumnDef } from "@/components/common/data-table";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ToneBadge } from "@/components/common/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatHubYearLevels, HubFormDialog, type HubItem } from "@/components/live/hub-form-dialog";
import { InstructorLiveRooms } from "@/components/live/instructor-live-rooms";

function HubsContent() {
  const searchParams = useSearchParams();
  const preselectedQuizId = searchParams.get("quiz") || "";

  const [hubs, setHubs] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<HubItem | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchHubs() {
      try {
        const res = await fetch("/api/live/hubs", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          toast.error(data?.error || "ไม่สามารถโหลดรายการ hub ได้");
          return;
        }
        const serverList = Array.isArray(data) ? (data as HubItem[]) : [];
        setHubs((prev) => {
          const serverIds = new Set(serverList.map((h) => h.id));
          const localOnly = prev.filter((h) => !serverIds.has(h.id));
          return [...localOnly, ...serverList];
        });
      } catch {
        if (active) toast.error("เกิดข้อผิดพลาดในการโหลดรายการ hub");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchHubs();
    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setEditingHub(null);
    setDialogOpen(true);
  }

  function openEdit(hub: HubItem) {
    setEditingHub(hub);
    setDialogOpen(true);
  }

  function handleSaved(saved: HubItem, isEdit: boolean) {
    setHubs((prev) =>
      isEdit ? prev.map((h) => (h.id === saved.id ? saved : h)) : [saved, ...prev]
    );
  }

  const columns: DataTableColumnDef[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <ColumnHeader column={column} title="ชื่อ Hub" />,
        cell: ({ row }) => {
          const item = row.original as HubItem;
          const href = preselectedQuizId
            ? `/i/live/hubs/${item.id}?quiz=${encodeURIComponent(preselectedQuizId)}`
            : `/i/live/hubs/${item.id}`;
          return (
            <Link href={href} className="font-semibold text-primary hover:underline">
              {item.name}
            </Link>
          );
        },
      },
      {
        accessorKey: "year_level",
        header: ({ column }) => <ColumnHeader column={column} title="ชั้นปี" />,
        cell: ({ row }) => {
          const item = row.original as HubItem;
          const text = formatHubYearLevels(item.year_level);
          return item.year_level.length === 0 ? (
            <Badge variant="secondary">{text}</Badge>
          ) : (
            <ToneBadge tone="info">{text}</ToneBadge>
          );
        },
      },
      {
        accessorKey: "room_count",
        header: ({ column }) => <ColumnHeader column={column} title="จำนวนห้อง" />,
        cell: ({ row }) => {
          const item = row.original as HubItem;
          return <span className="tabular-nums text-muted-foreground">{item.room_count} ห้อง</span>;
        },
      },
      {
        accessorKey: "member_count",
        header: ({ column }) => <ColumnHeader column={column} title="นักศึกษาที่เคยเล่น" />,
        cell: ({ row }) => {
          const item = row.original as HubItem;
          return <span className="tabular-nums text-muted-foreground">{item.member_count ?? 0} คน</span>;
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">จัดการ</span>,
        cell: ({ row }) => {
          const item = row.original as HubItem;
          const href = preselectedQuizId
            ? `/i/live/hubs/${item.id}?quiz=${encodeURIComponent(preselectedQuizId)}`
            : `/i/live/hubs/${item.id}`;
          return (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                <PencilIcon />
                แก้ไข
              </Button>
              <Button asChild size="sm">
                <Link href={href}>
                  เปิด Hub
                  <ArrowRightIcon />
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [preselectedQuizId]
  );

  return (
    <PageContainer>
      <PageHeader
        kicker="รวมเกม"
        title="Hub รวมเกมของฉัน"
        description="เลือก Hub เพื่อเปิดห้องควิซสดและดูประวัติห้องใน Hub นั้น"
        actions={
          <Button onClick={openCreate} disabled={loading}>
            <PlusIcon />
            สร้าง Hub ใหม่
          </Button>
        }
      />

      {preselectedQuizId && (
        <Alert className="mb-6">
          <InfoIcon className="size-4" />
          <AlertDescription>
            เลือก Hub ที่ต้องการเพื่อเปิดห้องด้วยชุดควิซที่เลือกไว้
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>รายการ Hub</CardTitle>
          <Badge variant="secondary">{hubs.length} hub</Badge>
        </CardHeader>
        <CardContent>
          <DataTable.Root
            data={hubs}
            columns={columns}
            getRowId={(r: HubItem) => r.id}
            searchKeys={["name"]}
          >
            <DataTable.Content
              loading={loading}
              empty={
                <EmptyState
                  icon={<LayersIcon />}
                  title="ยังไม่มี Hub"
                  description="สร้าง hub แรกของคุณเพื่อจัดกลุ่มห้องควิซตามชั้นปี"
                />
              }
            />
            <DataTable.Pagination />
          </DataTable.Root>
        </CardContent>
      </Card>

      <HubFormDialog
        key={`${editingHub?.id ?? "new"}-${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hub={editingHub}
        onSaved={handleSaved}
      />

      <Separator className="my-8" />

      <Suspense fallback={<LoadingState />}>
        <InstructorLiveRooms legacyOnly />
      </Suspense>
    </PageContainer>
  );
}

export default function InstructorLiveHubsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <HubsContent />
    </Suspense>
  );
}
