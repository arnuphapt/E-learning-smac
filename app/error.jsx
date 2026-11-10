"use client";

import { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex items-center justify-center min-h-[70vh] p-4" role="main">
      <div className="card w-full" style={{ maxWidth: 480 }}>
        <div className="empty">
          <div className="ec" aria-hidden="true" style={{ color: "var(--danger)" }}>
            <Icon name="alert-triangle" size={26} />
          </div>
          <h1 className="t-2xl fw-7" style={{ margin: 0, color: "var(--fg)" }}>
            เกิดข้อผิดพลาด
          </h1>
          <p className="muted t-sm center" style={{ margin: 0, maxWidth: 360 }}>
            ระบบพบปัญหาในการโหลดหรือแสดงผลข้อมูล กรุณาลองใหม่อีกครั้ง…
          </p>
          <div className="mt-4 flex gap-3 wrap justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="btn btn-primary"
            >
              <Icon name="refresh" size={16} />
              <span>ลองใหม่</span>
            </button>
            <Link href="/" className="btn btn-outline">
              <Icon name="home" size={16} />
              <span>หน้าหลัก</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
