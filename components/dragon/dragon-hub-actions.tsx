"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assetUrl } from "@/lib/dragon/asset-base.mjs";
import {
  DRAGON_GROWTH_THRESHOLDS,
  formatDragonGrowthThai,
  type DragonGrowthState,
} from "@/lib/dragon-growth";

export interface DragonHubItem {
  id: string;
  species_id: string;
  points: number;
  is_partner: boolean;
  created_at: string;
  hatched_at?: string | null;
  growth: DragonGrowthState;
}

interface DragonHubActionsProps {
  dragons: readonly DragonHubItem[];
  walletBalance: number;
  growingDragonId: string | null;
  onRefresh: () => Promise<void>;
}

interface CatalogResponse {
  species?: Array<{ id: string; name?: string }>;
}

export function DragonHubActions({
  dragons,
  walletBalance,
  growingDragonId,
  onRefresh,
}: DragonHubActionsProps) {
  const [speciesNames, setSpeciesNames] = useState<Record<string, string>>({});
  const [partnerPendingId, setPartnerPendingId] = useState<string | null>(null);
  const [buyingEgg, setBuyingEgg] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const eggPrice = DRAGON_GROWTH_THRESHOLDS.eggPrice;
  const hasUnhatchedEgg = dragons.some((d) => d.hatched_at === null);
  const canBuyEgg = walletBalance >= eggPrice && !hasUnhatchedEgg;

  useEffect(() => {
    const controller = new AbortController();
    fetch(assetUrl("generated/hatching/catalog.json"), {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<CatalogResponse>) : null))
      .then((catalog) => {
        if (!catalog?.species || controller.signal.aborted) return;
        const map: Record<string, string> = {};
        for (const sp of catalog.species) {
          if (sp.id && sp.name) map[sp.id] = sp.name;
        }
        setSpeciesNames(map);
      })
      .catch(() => {
        // Fallback to species_id label when catalog is unavailable.
      });
    return () => controller.abort();
  }, []);

  async function handleSetPartner(dragonId: string) {
    if (partnerPendingId || buyingEgg) return;
    setPartnerPendingId(dragonId);
    try {
      const res = await fetch("/api/dragon/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dragon_id: dragonId }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(body?.error || "ไม่สามารถเลือกมังกรคู่ใจได้");
        return;
      }
      await onRefresh();
      toast.success("ตั้งเป็นมังกรคู่ใจเรียบร้อยแล้ว");
    } catch {
      toast.error("ไม่สามารถเลือกมังกรคู่ใจได้");
    } finally {
      setPartnerPendingId(null);
    }
  }

  async function handleBuyEgg() {
    if (buyingEgg || !canBuyEgg) return;
    setBuyingEgg(true);
    try {
      const res = await fetch("/api/dragon/egg", { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(body?.error || "ไม่สามารถสุ่มไข่ใบใหม่ได้");
        return;
      }
      // Purchase is committed; a failed refetch must not read as a failed purchase.
      setConfirmOpen(false);
      toast.success("สุ่มไข่มังกรใบใหม่เรียบร้อยแล้ว");
      await onRefresh().catch(() =>
        toast.error("โหลดข้อมูลมังกรไม่สำเร็จ กรุณารีเฟรชหน้านี้")
      );
    } catch {
      toast.error("ไม่สามารถสุ่มไข่ใบใหม่ได้");
    } finally {
      setBuyingEgg(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-3">
        <CardTitle className="text-base">
          มังกรของฉัน ({dragons.length} ตัว)
        </CardTitle>

        <div className="flex flex-col items-end gap-1">
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={!canBuyEgg || buyingEgg}>
                {buyingEgg
                  ? "กำลังสุ่มไข่…"
                  : `สุ่มไข่ใบใหม่ (${eggPrice.toLocaleString("th-TH")} แต้ม)`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันสุ่มไข่ใบใหม่</AlertDialogTitle>
                <AlertDialogDescription>
                  ใช้ {eggPrice.toLocaleString("th-TH")} แต้มจากแต้มคงเหลือ
                  เพื่อสุ่มไข่มังกรใบใหม่ ไข่ใบใหม่จะกลายเป็นมังกรที่กำลังเลี้ยง
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={buyingEgg}>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction
                  disabled={buyingEgg}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleBuyEgg();
                  }}
                >
                  {buyingEgg ? "กำลังสุ่ม…" : "สุ่มไข่"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {hasUnhatchedEgg && (
            <p className="text-xs text-muted-foreground">
              ยังมีไข่ที่ยังไม่ฟัก ฟักไข่ใบเดิมก่อนจึงจะสุ่มไข่ใบใหม่ได้
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-2 pb-4 sm:grid-cols-2 lg:grid-cols-3">
        {dragons.map((dragon) => {
          const name =
            speciesNames[dragon.species_id] || `สายพันธุ์ ${dragon.species_id}`;
          const isGrowing = dragon.id === growingDragonId;
          const isPending = partnerPendingId === dragon.id;

          return (
            <div
              key={dragon.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{name}</span>
                  {dragon.is_partner && <Badge>คู่ใจ</Badge>}
                  {isGrowing && <Badge variant="outline">กำลังเลี้ยง</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDragonGrowthThai(dragon.growth)} ·{" "}
                  {dragon.points.toLocaleString("th-TH")} แต้ม
                </p>
              </div>

              {!dragon.is_partner && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={Boolean(partnerPendingId) || buyingEgg}
                  onClick={() => void handleSetPartner(dragon.id)}
                >
                  {isPending ? "กำลังตั้ง…" : "ตั้งเป็นคู่ใจ"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
