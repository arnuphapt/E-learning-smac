"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import {
  HubDragonScene,
  type HubDragonsPayload,
} from "@/components/dragon/hub-dragon-scene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StudentLiveHubScenePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [hubInfo, setHubInfo] = useState<HubDragonsPayload["hub"] | null>(null);
  const [accessError, setAccessError] = useState<{
    status: number;
    message: string;
  } | null>(null);

  const handleLoaded = useCallback((payload: HubDragonsPayload) => {
    setHubInfo(payload.hub);
    setAccessError(null);
  }, []);

  const handleAccessError = useCallback((status: number, message: string) => {
    setAccessError({ status, message });
  }, []);

  if (accessError) {
    const title =
      accessError.status === 403
        ? "คุณยังไม่ได้เป็นสมาชิก hub นี้"
        : "ไม่พบ hub";
    return (
      <PageContainer>
        <ErrorState title={title} description={accessError.message} />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/s/live/quiz">
              <ArrowLeftIcon />
              กลับหน้าควิซสด
            </Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-4 pb-4 md:pb-6">
      <PageHeader
        kicker="Hub รวมเกม"
        title={hubInfo?.name ?? "ฉากรวม Hub"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hubInfo && (
              <Badge variant="secondary">
                {hubInfo.year_level.length > 0
                  ? `ชั้นปี ${hubInfo.year_level.join(", ")}`
                  : "ทุกชั้นปี"}
              </Badge>
            )}
            <Button asChild variant="outline">
              <Link href="/s/live/quiz">
                <ArrowLeftIcon />
                กลับหน้าควิซสด
              </Link>
            </Button>
          </div>
        }
      />

      <HubDragonScene
        hubId={id}
        heightClassName="h-[calc(100dvh-16rem)] min-h-[460px]"
        onLoaded={handleLoaded}
        onAccessError={handleAccessError}
      />
    </PageContainer>
  );
}
