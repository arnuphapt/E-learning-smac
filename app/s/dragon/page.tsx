"use client";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DragonGame } from "@/components/dragon/dragon-game";

export default function StudentDragonPage() {
  return (
    <PageContainer className="flex flex-col pb-4 md:pb-6">
      <PageHeader
        kicker="กิจกรรมการเรียนรู้"
        title="ฐานมังกร"
        description="ฟักไข่ เลี้ยงลูกมังกรจนเติบโตเป็นมังกรบิน และเปิดพื้นที่ใหม่ในฐานของคุณ"
      />
      <div className="h-[calc(100dvh-13rem)] min-h-[480px] w-full">
        <DragonGame />
      </div>
    </PageContainer>
  );
}
