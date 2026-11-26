"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { formatHubYearLevels, type HubItem } from "@/components/live/hub-form-dialog";
import { InstructorLiveRooms } from "@/components/live/instructor-live-rooms";
import { HubDragonScene } from "@/components/dragon/hub-dragon-scene";
import { Separator } from "@/components/ui/separator";

export default function InstructorLiveHubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [hub, setHub] = useState<HubItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadHub() {
      try {
        const res = await fetch(`/api/live/hubs/${id}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setError(data?.error || "ไม่พบข้อมูล hub");
          return;
        }
        setHub(data);
      } catch {
        if (active) setError("เกิดข้อผิดพลาดในการโหลดข้อมูล hub");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadHub();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState label="กำลังโหลดข้อมูล Hub..." />
      </PageContainer>
    );
  }

  if (error || !hub) {
    return (
      <PageContainer>
        <ErrorState
          title="ไม่สามารถเปิด Hub ได้"
          description={error || "ไม่พบ hub ที่ต้องการ"}
        />
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/i/live/hubs">
              <ArrowLeftIcon />
              กลับหน้ารายการ Hub
            </Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        kicker="Hub รวมเกม"
        title={hub.name}
        description={`กลุ่มเป้าหมาย: ${formatHubYearLevels(hub.year_level)} · ${hub.room_count} ห้อง`}
        actions={
          <Button asChild variant="outline">
            <Link href="/i/live/hubs">
              <ArrowLeftIcon />
              กลับหน้ารายการ Hub
            </Link>
          </Button>
        }
      />

      <HubDragonScene
        hubId={hub.id}
        allowFullscreen
        heightClassName="h-[520px]"
      />

      <Separator className="my-6" />

      <Suspense fallback={<LoadingState />}>
        <InstructorLiveRooms hubId={hub.id} />
      </Suspense>
    </PageContainer>
  );
}
