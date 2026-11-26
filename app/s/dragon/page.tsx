"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DragonSceneView } from "@/components/dragon/dragon-game";
import {
  DragonHubActions,
  type DragonHubItem,
} from "@/components/dragon/dragon-hub-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDragonGrowthThai } from "@/lib/dragon-growth";

interface DragonMePayload {
  dragons: DragonHubItem[];
  wallet: {
    balance: number;
    lifetime: number;
  };
  growingDragonId: string | null;
}

export default function StudentDragonPage() {
  const [data, setData] = useState<DragonMePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/dragon/me", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("ไม่สามารถโหลดข้อมูลมังกรได้");
    }
    const payload = (await res.json()) as DragonMePayload;
    setData(payload);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dragon/me", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || "ไม่สามารถโหลดข้อมูลมังกรได้");
        }
        return (await res.json()) as DragonMePayload;
      })
      .then((payload) => {
        if (!controller.signal.aborted) {
          setData(payload);
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลมังกรได้"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadKey]);

  const activeDragon =
    data?.dragons.find((d) => d.id === data.growingDragonId) ??
    data?.dragons[0] ??
    null;

  return (
    <PageContainer className="flex flex-col gap-4 pb-4 md:pb-6">
      <PageHeader
        kicker="กิจกรรมการเรียนรู้"
        title="มังกรของฉัน"
        description="ดูมังกรของคุณที่เติบโตจากแต้มควิซสด ติดตามขั้นการเติบโต และแต้มคงเหลือ"
      />

      {loading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-[480px] w-full rounded-xl" />
        </div>
      )}

      {!loading && error && (
        <Alert variant="destructive">
          <AlertTitle>โหลดข้อมูลมังกรไม่สำเร็จ</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              ลองใหม่
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && data && data.dragons.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">ยังไม่มีมังกร</h2>
              <p className="text-sm text-muted-foreground">
                เล่นควิซสดเพื่อรับไข่มังกรตัวแรกและสะสมแต้มให้มังกรเติบโต
              </p>
            </div>
            <Button asChild>
              <Link href="/s/live/quiz">ไปหน้าควิซสด</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && data.dragons.length > 0 && activeDragon && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {data.growingDragonId ? "มังกรที่กำลังเลี้ยง" : "มังกรล่าสุด"}
                </span>
                <Badge variant="secondary">
                  {formatDragonGrowthThai(activeDragon.growth)}
                </Badge>
                <span className="text-sm font-medium">
                  {activeDragon.points.toLocaleString("th-TH")} แต้ม
                </span>
                <span className="text-sm text-muted-foreground">
                  {activeDragon.growth.nextAt !== null
                    ? `อีก ${activeDragon.growth.toNext.toLocaleString("th-TH")} แต้มถึงขั้นถัดไป`
                    : "โตเต็มที่แล้ว"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  ทั้งหมด {data.dragons.length} ตัว
                </span>
                <div>
                  <span className="text-muted-foreground">แต้มคงเหลือ: </span>
                  <span className="font-semibold">
                    {data.wallet.balance.toLocaleString("th-TH")} แต้ม
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="h-[calc(100dvh-19rem)] min-h-[460px] w-full">
            <DragonSceneView dragons={data.dragons} />
          </div>

          <DragonHubActions
            dragons={data.dragons}
            walletBalance={data.wallet.balance}
            growingDragonId={data.growingDragonId}
            onRefresh={refresh}
          />
        </>
      )}
    </PageContainer>
  );
}
