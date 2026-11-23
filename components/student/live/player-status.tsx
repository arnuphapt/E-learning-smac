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
      <Card className="w-full max-w-md border-destructive/30 text-center" role="alert">
        <CardContent className="flex flex-col items-center gap-4 py-4">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircleIcon className="size-6" />
          </div>
          <h1 className="text-xl font-bold">เกิดข้อผิดพลาดในการโหลดห้อง</h1>
          <p className="text-sm text-muted-foreground">{message || "ไม่สามารถเชื่อมต่อห้องควิซได้"}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={onRetry}>ลองใหม่อีกครั้ง</Button>
            <Button asChild variant="outline">
              <Link href="/s/live">กลับหน้ารายการ</Link>
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
    <PlayerScreen className="items-center justify-center p-6 text-muted-foreground">
      <Spinner className="mb-4 size-10 text-primary" aria-label="กำลังเชื่อมต่อ" />
      <p className="text-sm">กำลังเชื่อมต่อห้องควิซสด…</p>
    </PlayerScreen>
  );
}
