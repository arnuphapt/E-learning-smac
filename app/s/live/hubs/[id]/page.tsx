"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { poppins } from "@/components/dragon/dragon-base-theme";
import "@/components/dragon/dragon-base.css";
import {
  HubDragonScene,
  type HubDragonsPayload,
} from "@/components/dragon/hub-dragon-scene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <PageContainer className="pb-4 md:pb-6">
        <div className={cn("dragon-base flex flex-col gap-4", poppins.variable)}>
          <div className="db-panel flex flex-col items-center gap-4 py-10 text-center" role="alert">
            <div className="space-y-1">
              <h1 className="text-[22px] font-bold text-[var(--warn)]">{title}</h1>
              <p className="text-sm text-[var(--text-muted)]">{accessError.message}</p>
            </div>
            <Button asChild className="db-btn">
              <Link href="/s/live/quiz">
                <ArrowLeftIcon />
                กลับหน้าควิซสด
              </Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pb-4 md:pb-6">
      <div className={cn("dragon-base flex flex-col gap-4", poppins.variable)}>
        <div className="db-panel flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-[var(--text-subtle)]">
              Hub รวมเกม
            </p>
            <h1 className="text-2xl font-bold text-[var(--text-strong)] sm:text-[32px] sm:leading-9">
              {hubInfo?.name ?? "ฉากรวม Hub"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hubInfo && (
              <Badge className="rounded-[var(--radius-sm)] border border-[var(--frame-soft)] bg-[var(--surface-1)] px-2.5 py-0.5 text-sm font-semibold text-[var(--text-cream)]">
                {hubInfo.year_level.length > 0
                  ? `ชั้นปี ${hubInfo.year_level.join(", ")}`
                  : "ทุกชั้นปี"}
              </Badge>
            )}
            <Button asChild className="db-btn">
              <Link href="/s/live/quiz">
                <ArrowLeftIcon />
                กลับหน้าควิซสด
              </Link>
            </Button>
          </div>
        </div>

        <HubDragonScene
          hubId={id}
          heightClassName="h-[calc(100dvh-16rem)] min-h-[460px]"
          onLoaded={handleLoaded}
          onAccessError={handleAccessError}
        />
      </div>
    </PageContainer>
  );
}
