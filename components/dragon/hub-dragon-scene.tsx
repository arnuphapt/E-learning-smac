"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2Icon,
  Minimize2Icon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react";
import { DragonSceneView } from "@/components/dragon/dragon-game";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DragonSceneInputItem } from "@/lib/dragon-scene";
import { cn } from "@/lib/utils";

export const HUB_SCENE_MAX_DRAGONS = 40;

export interface HubDragonsPayload {
  hub: {
    id: string;
    name: string;
    year_level: number[];
  };
  total_members: number;
  dragons: DragonSceneInputItem[];
}

interface HubDragonSceneProps {
  hubId: string;
  allowFullscreen?: boolean;
  heightClassName?: string;
  onLoaded?: (payload: HubDragonsPayload) => void;
  onAccessError?: (status: number, message: string) => void;
}

export function HubDragonScene({
  hubId,
  allowFullscreen = false,
  heightClassName = "h-[520px]",
  onLoaded,
  onAccessError,
}: HubDragonSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [payload, setPayload] = useState<HubDragonsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [fetchSeq, setFetchSeq] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/live/hubs/${hubId}/dragons`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | (HubDragonsPayload & { error?: string })
          | { error?: string }
          | null;
        if (controller.signal.aborted) return;

        if (!res.ok) {
          const msg =
            (body && "error" in body && body.error) ||
            (res.status === 403
              ? "คุณยังไม่ได้เป็นสมาชิก hub นี้"
              : res.status === 404
                ? "ไม่พบ hub"
                : "ไม่สามารถโหลดฉากมังกรของ hub ได้");
          if ((res.status === 403 || res.status === 404) && onAccessError) {
            onAccessError(res.status, msg);
          }
          setError(msg);
          return;
        }

        const data = body as HubDragonsPayload;
        setPayload(data);
        setError("");
        if (fetchSeq > 0) {
          setRefreshSeq((n) => n + 1);
        }
        onLoaded?.(data);
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError("ไม่สามารถโหลดฉากมังกรของ hub ได้");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [hubId, fetchSeq, onLoaded, onAccessError]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setFetchSeq((n) => n + 1);
  }, [refreshing]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen denial.
    }
  }, []);

  const visibleDragons = useMemo(
    () => (payload?.dragons ?? []).slice(0, HUB_SCENE_MAX_DRAGONS),
    [payload]
  );
  const totalMembers = payload?.total_members ?? 0;

  return (
    <Card className="db-hub-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-3">
        <div className="space-y-0.5">
          <CardTitle className="db-hub-title text-base">ฉากมังกรรวมของ Hub</CardTitle>
          {payload && (
            <p className="db-hub-meta text-xs text-muted-foreground">
              {totalMembers > visibleDragons.length
                ? `แสดง ${visibleDragons.length} จาก ${totalMembers} คน`
                : `สมาชิกทั้งหมด ${totalMembers} คน`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="db-hub-btn"
            variant="outline"
            size="sm"
            disabled={loading || refreshing}
            onClick={handleRefresh}
          >
            <RefreshCwIcon className={refreshing ? "animate-spin" : ""} />
            รีเฟรช
          </Button>
          {allowFullscreen && visibleDragons.length > 0 && (
            <Button
              className="db-hub-btn"
              variant="outline"
              size="sm"
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
              {isFullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {loading && <Skeleton className={cn("w-full rounded-xl", heightClassName)} />}

        {!loading && error && (
          <ErrorState title="โหลดฉากมังกรไม่สำเร็จ" description={error} />
        )}

        {!loading && !error && visibleDragons.length === 0 && (
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" />}
            title="ยังไม่มีมังกรใน Hub นี้"
            description="เมื่อนักศึกษาเล่นควิซสดใน Hub นี้และมีมังกรคู่ใจ มังกรจะมาปรากฏที่นี่"
          />
        )}

        {!loading && !error && visibleDragons.length > 0 && (
          <div
            ref={containerRef}
            className={cn(
              "db-hub-frame w-full overflow-hidden rounded-xl bg-card",
              isFullscreen ? "h-screen" : heightClassName
            )}
          >
            <DragonSceneView
              key={`${hubId}:${refreshSeq}`}
              dragons={visibleDragons}
              allowAdultDrag
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
