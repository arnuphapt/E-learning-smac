"use client";

import { RadioIcon } from "lucide-react";
import { GameCardGrid, type GameCardItem } from "@/components/common/game-card";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";

const STUDENT_GAMES: GameCardItem[] = [
  {
    id: "live-quiz",
    title: "ควิซสด",
    description: "กรอก PIN เพื่อเข้าร่วมห้องควิซสด ตอบคำถามแบบเรียลไทม์ และดูประวัติคะแนนของคุณ",
    href: "/s/live/quiz",
    ctaLabel: "เข้าเล่นควิซสด",
    badge: "พร้อมเล่น",
    icon: <RadioIcon className="size-5" />,
  },
];

export default function StudentLiveIndexPage() {
  return (
    <PageContainer>
      <PageHeader
        title="รวมเกม"
        description="เลือกเกมที่ต้องการเข้าร่วมเพื่อฝึกทบทวนและสะสมคะแนน"
      />
      <GameCardGrid games={STUDENT_GAMES} />
    </PageContainer>
  );
}
