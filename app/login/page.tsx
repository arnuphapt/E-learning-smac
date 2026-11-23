"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ActivityIcon, ArrowLeftIcon, CircleXIcon } from "lucide-react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") || null;
  const rawCallback = searchParams?.get("callbackUrl");
  const callbackUrl = (rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//") && !rawCallback.startsWith("/\\"))
    ? rawCallback
    : "/s/courses";

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ActivityIcon className="size-6" />
          </div>
          <div className="grid leading-tight">
            <span className="font-semibold">Digital learning space</span>
            <span className="text-xs text-muted-foreground">พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับสาระสำคัญทางการพยาบาล</span>
          </div>
        </div>
        <h1 className="text-2xl leading-none font-semibold">เข้าสู่ระบบ</h1>
        <CardDescription>ลงชื่อเข้าใช้เพื่อเข้าถึงรายวิชา บทเรียน และสื่อการสอนทั้งหมด</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive">
            <CircleXIcon />
            <AlertDescription className="text-destructive">
              {error === "OAuthAccountNotLinked"
                ? "อีเมลนี้ถูกใช้กับวิธีการเข้าสู่ระบบอื่นแล้ว"
                : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง"}
            </AlertDescription>
          </Alert>
        )}
        <Button id="google-login-btn" size="lg" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? <Spinner /> : <GoogleIcon />}
          {loading ? "กำลังดำเนินการ…" : "เข้าสู่ระบบด้วย Google"}
        </Button>
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 text-sm text-muted-foreground">
        <Button variant="link" asChild className="h-auto p-0">
          <Link href="/">
            <ArrowLeftIcon />
            กลับหน้าหลัก
          </Link>
        </Button>
        <p className="text-xs">วิทยาลัยพยาบาลศรีมหาสารคาม · สถาบันพระบรมราชชนก</p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Suspense
        fallback={
          <Card className="flex min-h-48 w-full max-w-md items-center justify-center">
            <Spinner aria-label="กำลังโหลด" />
          </Card>
        }
      >
        <LoginContent />
      </Suspense>
    </main>
  );
}
