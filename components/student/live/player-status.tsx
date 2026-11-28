import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PlayerScreen } from "./player-screen";

/** The room could not be loaded: message, retry and the way back to the live page. */
export function PlayerLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <PlayerScreen className="items-center justify-center p-6">
      <Card className="db-panel w-full max-w-md text-center" role="alert">
        <CardContent className="flex flex-col items-center gap-4 py-4">
          <div className="grid size-12 place-items-center rounded-full bg-[#d22f4c]/20 text-[var(--warn)]">
            <AlertCircleIcon className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text)]">เกิดข้อผิดพลาดในการโหลดห้อง</h1>
          <p className="text-sm text-[var(--text-muted)]">{message || "ไม่สามารถเชื่อมต่อห้องควิซได้"}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button onClick={onRetry} className="db-btn db-btn--accept h-auto px-5 py-2.5 text-base font-bold">
              ลองใหม่อีกครั้ง
            </Button>
            <Button asChild variant="outline" className="db-btn db-btn--default h-auto px-5 py-2.5 text-base font-bold">
              <Link href="/s/live/quiz">กลับหน้ารายการ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PlayerScreen>
  );
}

/** Waiting for the first session state. */
export function PlayerConnecting() {
  return (
    <PlayerScreen className="items-center justify-center p-6">
      <div className="db-panel flex flex-col items-center px-8 py-6">
        <Spinner className="mb-3 size-10 text-[var(--accept)]" aria-label="กำลังเชื่อมต่อ" />
        <p className="text-sm font-medium text-[var(--text-strong)]">กำลังเชื่อมต่อห้องควิซสด…</p>
      </div>
    </PlayerScreen>
  );
}
