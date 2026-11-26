"use client";

import Link from "next/link";
import { LibraryBigIcon, RadioIcon } from "lucide-react";
import { GameCardGrid, type GameCardItem } from "@/components/common/game-card";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

const INSTRUCTOR_GAMES: GameCardItem[] = [
  {
    id: "live-quiz",
    title: "ควิซสด",
    description: "จัดการ hub ตามชั้นปี และเปิดห้องแข่งขันตอบคำถามแบบเรียลไทม์ผ่านจอโปรเจกเตอร์",
    href: "/i/live/hubs",
    ctaLabel: "ไปยัง Hub ควิซสด",
    badge: "พร้อมใช้งาน",
    icon: <RadioIcon className="size-5" />,
  },
];

export default function InstructorLivePage() {
  return (
    <PageContainer>
      <PageHeader
        title="รวมเกม"
        description="เลือกเกมเพื่อจัดการ hub และเปิดห้องกิจกรรมสำหรับนักศึกษา"
        actions={
          <Button asChild variant="outline">
            <Link href="/i/live/quizzes">
              <LibraryBigIcon />
              คลังชุดควิซของฉัน
            </Link>
          </Button>
        }
      />
      <GameCardGrid games={INSTRUCTOR_GAMES} />
    </PageContainer>
  );
}
