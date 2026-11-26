"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UsersIcon } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import StudentQuizHistory from "@/components/live/student-quiz-history";
import { JoinPinForm } from "@/components/student/live/join-pin-form";

interface PlayedHub {
  id: string;
  name: string;
  year_level: number[];
  first_played_at: string;
  member_count: number;
}

export default function StudentLiveQuizPage() {
  const [hubs, setHubs] = useState<PlayedHub[]>([]);
  const [hubsLoading, setHubsLoading] = useState(true);
  const [hubsError, setHubsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/live/hubs/mine", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดรายการ hub ได้");
        }
        return (await res.json()) as { hubs?: PlayedHub[] };
      })
      .then((payload) => {
        if (!controller.signal.aborted) {
          setHubs(payload.hubs ?? []);
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setHubsError(
          err instanceof Error ? err.message : "ไม่สามารถโหลดรายการ hub ได้"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setHubsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        kicker="กิจกรรมการเรียนรู้"
        title="รวมเกม"
        description="กรอก PIN เพื่อเข้าร่วมห้องควิซสดและตอบคำถามแข่งขันแบบเรียลไทม์"
      />
      <JoinPinForm />
      <Separator className="mb-6" />

      <section className="mb-6 space-y-3" aria-label="Hub ที่เคยเล่น">
        <h2 className="text-lg font-semibold">Hub ที่เคยเล่น</h2>

        {hubsLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {!hubsLoading && hubsError && (
          <ErrorState title="โหลดรายการ hub ไม่สำเร็จ" description={hubsError} />
        )}

        {!hubsLoading && !hubsError && hubs.length === 0 && (
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" />}
            title="ยังไม่มี hub ที่เคยเล่น"
            description="เข้าร่วมควิซสดใน hub ของอาจารย์เพื่อดูฉากมังกรรวมของห้อง"
          />
        )}

        {!hubsLoading && !hubsError && hubs.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hubs.map((hub) => (
              <Link
                key={hub.id}
                href={`/s/live/hubs/${hub.id}`}
                className="block transition-opacity hover:opacity-90"
              >
                <Card className="h-full">
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{hub.name}</span>
                      <Badge variant="secondary">
                        {hub.member_count} คน
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hub.year_level.length > 0
                        ? `ชั้นปี ${hub.year_level.join(", ")}`
                        : "ทุกชั้นปี"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Separator className="mb-6" />
      <StudentQuizHistory />
    </PageContainer>
  );
}
