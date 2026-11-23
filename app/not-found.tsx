import Link from "next/link";
import { HomeIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
            <SearchIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">ไม่พบหน้าที่ต้องการ</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            หน้านี้อาจไม่มีอยู่ ถูกลบไปแล้ว หรือคุณอาจพิมพ์ที่อยู่ไม่ถูกต้อง กรุณาตรวจสอบที่อยู่อีกครั้ง…
          </p>
          <Button asChild className="mt-2">
            <Link href="/">
              <HomeIcon />
              กลับหน้าหลัก
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
