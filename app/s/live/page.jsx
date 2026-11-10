"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHead } from "@/components/ui/Shared";
import StudentQuizHistory from "@/components/live/StudentQuizHistory";

export default function StudentLiveIndexPage() {
  const router = useRouter();

  // PIN Form State
  const [pin, setPin] = useState("");
  const [joining, setJoining] = useState(false);
  const [pinError, setPinError] = useState("");

  async function handleJoin(e) {
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPinError(data.error || "ไม่สามารถเข้าร่วมห้องได้");
        setJoining(false);
        return;
      }

      router.push(`/s/live/${data.id}`);
    } catch (err) {
      setPinError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setJoining(false);
    }
  }

  return (
    <div className="container py-6">
      {/* 1. หัวหน้า "ควิซสด" */}
      <PageHead
        kicker="กิจกรรมการเรียนรู้"
        title="ควิซสด"
        desc="กรอก PIN เพื่อเข้าร่วมห้องควิซสดและตอบคำถามแข่งขันแบบเรียลไทม์"
      />

      {/* 2. เข้าร่วมควิซสด (PIN - Kahoot Style) */}
      <div className="mb-10 max-w-lg">
        <div className="flex items-end justify-between gap-2 mb-4 wrap">
          <div>
            <h2 className="t-xl fw-7 serif" style={{ color: "var(--fg)", margin: 0 }}>
              เข้าร่วมควิซสด
            </h2>
            <div className="muted t-xs mt-0.5">
              กรอก PIN 6 หลักที่ผู้สอนแสดงบนหน้าจอเพื่อเข้าร่วมห้องควิซ
            </div>
          </div>
        </div>

        <div className="card shadow-md border">
          <div className="card-p p-6">
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label
                  htmlFor="quiz-pin"
                  className="t-xs fw-6 uppercase tracking-wider muted block mb-2"
                >
                  PIN ของห้อง
                </label>
                <input
                  id="quiz-pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPin(val);
                    if (pinError) setPinError("");
                  }}
                  placeholder="123456"
                  className="input w-full text-center text-3xl font-mono tracking-widest font-bold"
                  style={{ height: 60 }}
                  autoFocus
                  disabled={joining}
                />
                <span className="hint mt-2 block text-xs muted text-center">
                  กรอกตัวเลข 6 หลักจากหน้าจอของผู้สอน
                </span>
              </div>

              {pinError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive text-center">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                disabled={joining || pin.trim().length !== 6}
                className="btn btn-primary w-full text-base font-bold shadow-md"
                style={{ height: 48 }}
              >
                {joining ? "กำลังเข้าห้อง…" : "เข้าร่วมควิซ"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. ประวัติควิซสดของฉัน */}
      <div className="pt-6 border-t border-border">
        <StudentQuizHistory />
      </div>
    </div>
  );
}
