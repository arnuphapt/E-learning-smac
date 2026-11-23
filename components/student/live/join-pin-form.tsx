"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** PIN entry (Kahoot style): 6 digits, POST /api/live/join, then the room page. */
export function JoinPinForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [joining, setJoining] = useState(false);
  const [pinError, setPinError] = useState("");

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPinError("");

    const trimmedPin = pin.trim();
    if (!/^\d{6}$/.test(trimmedPin)) {
      setPinError("กรุณากรอก PIN เป็นตัวเลข 6 หลัก");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch("/api/live/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: trimmedPin }),
      });

      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setPinError(data.error || "ไม่สามารถเข้าร่วมห้องได้");
        setJoining(false);
        return;
      }

      router.push(`/s/live/${data.id}`);
    } catch {
      setPinError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setJoining(false);
    }
  }

  return (
    <div className="mb-10 max-w-lg">
      <h2 className="text-xl font-bold">เข้าร่วมควิซสด</h2>
      <p className="mt-0.5 mb-4 text-xs text-muted-foreground">กรอก PIN 6 หลักที่ผู้สอนแสดงบนหน้าจอเพื่อเข้าร่วมห้องควิซ</p>
      <Card>
        <CardContent>
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <FormField label="PIN ของห้อง" htmlFor="quiz-pin" description="กรอกตัวเลข 6 หลักจากหน้าจอของผู้สอน">
              <Input
                id="quiz-pin"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (pinError) setPinError("");
                }}
                placeholder="123456"
                className="h-15 text-center font-mono text-3xl font-bold tracking-widest md:text-3xl"
                autoFocus
                disabled={joining}
              />
            </FormField>

            {pinError && (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
                <AlertDescription className="text-destructive">{pinError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="h-12 w-full text-base font-bold" disabled={joining || pin.trim().length !== 6}>
              {joining ? "กำลังเข้าห้อง…" : "เข้าร่วมควิซ"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
