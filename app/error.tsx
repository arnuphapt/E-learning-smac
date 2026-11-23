"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon, HomeIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
            <AlertTriangleIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">เกิดข้อผิดพลาด</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            ระบบพบปัญหาในการโหลดหรือแสดงผลข้อมูล กรุณาลองใหม่อีกครั้ง…
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button onClick={() => reset()}>
              <RefreshCwIcon />
              ลองใหม่
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <HomeIcon />
                หน้าหลัก
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
