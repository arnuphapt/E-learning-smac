"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/common/page-container";
import { DragonSceneView } from "@/components/dragon/dragon-game";
import { poppins } from "@/components/dragon/dragon-base-theme";
import "@/components/dragon/dragon-base.css";
import {
  DragonHubActions,
  type DragonHubItem,
} from "@/components/dragon/dragon-hub-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDragonGrowthThai } from "@/lib/dragon-growth";
import { cn } from "@/lib/utils";

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
    <PageContainer className="pb-4 md:pb-6">
      <div className={cn("dragon-base flex flex-col gap-4", poppins.variable)}>
        <div className="db-panel flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-[var(--text-subtle)]">
              กิจกรรมการเรียนรู้
            </p>
            <h1 className="text-2xl font-bold text-[var(--text-strong)] sm:text-[32px] sm:leading-9">
              มังกรของฉัน
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              ดูมังกรของคุณที่เติบโตจากแต้มควิซสด ติดตามขั้นการเติบโต และแต้มคงเหลือ
            </p>
          </div>
          {data && (
            <div className="db-currency" aria-label="แต้มคงเหลือ">
              <span className="db-coin" aria-hidden />
              <span>{data.wallet.balance.toLocaleString("th-TH")}</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-[var(--radius-lg)] bg-[var(--surface-1)]" />
            <Skeleton className="h-[480px] w-full rounded-[var(--radius-lg)] bg-[var(--surface-1)]" />
          </div>
        )}

        {!loading && error && (
          <div className="db-panel flex flex-wrap items-center justify-between gap-3" role="alert">
            <div>
              <p className="text-base font-bold text-[var(--warn)]">
                โหลดข้อมูลมังกรไม่สำเร็จ
              </p>
              <p className="text-sm text-[var(--text-muted)]">{error}</p>
            </div>
            <Button className="db-btn" onClick={retry}>
              ลองใหม่
            </Button>
          </div>
        )}

        {!loading && !error && data && data.dragons.length === 0 && (
          <div className="db-panel flex flex-col items-center gap-4 py-12 text-center">
            <div className="space-y-1">
              <h2 className="text-[22px] font-bold text-[var(--text-strong)]">
                ยังไม่มีมังกร
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                เล่นควิซสดเพื่อรับไข่มังกรตัวแรกและสะสมแต้มให้มังกรเติบโต
              </p>
            </div>
            <Button asChild className="db-btn db-btn--accept">
              <Link href="/s/live/quiz">ไปหน้าควิซสด</Link>
            </Button>
          </div>
        )}

        {!loading && !error && data && data.dragons.length > 0 && activeDragon && (
          <>
            <div className="db-panel flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[var(--text-subtle)]">
                  {data.growingDragonId ? "มังกรที่กำลังเลี้ยง" : "มังกรล่าสุด"}
                </span>
                <Badge className="rounded-[var(--radius-sm)] border border-[var(--frame-soft)] bg-[var(--surface-1)] px-2.5 py-0.5 text-sm font-semibold text-[var(--text-cream)]">
                  {formatDragonGrowthThai(activeDragon.growth)}
                </Badge>
                <span className="text-sm font-semibold tabular-nums text-[var(--text-strong)]">
                  {activeDragon.points.toLocaleString("th-TH")} แต้ม
                </span>
                <span className="text-sm text-[var(--text-muted)] tabular-nums">
                  {activeDragon.growth.nextAt !== null
                    ? `อีก ${activeDragon.growth.toNext.toLocaleString("th-TH")} แต้มถึงขั้นถัดไป`
                    : "โตเต็มที่แล้ว"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-[var(--text-subtle)] tabular-nums">
                  ทั้งหมด {data.dragons.length} ตัว
                </span>
                <div className="tabular-nums">
                  <span className="text-[var(--text-muted)]">แต้มคงเหลือ: </span>
                  <span className="font-semibold text-[var(--gold)]">
                    {data.wallet.balance.toLocaleString("th-TH")} แต้ม
                  </span>
                </div>
              </div>
            </div>

            <div className="h-[calc(100dvh-19rem)] min-h-[460px] w-full overflow-hidden rounded-[var(--radius-lg)] border-y-2 border-[var(--frame)] shadow-[var(--shadow-panel)]">
              <DragonSceneView
                dragons={data.dragons}
                allowHatch
                allowSummon
                allowPartner
                allowAdultDrag
                walletBalance={data.wallet.balance}
                onHatched={refresh}
                onSummoned={refresh}
                onPartnerChanged={refresh}
              />
            </div>

            <DragonHubActions
              dragons={data.dragons}
              growingDragonId={data.growingDragonId}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
