"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";

function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
    return alpha != null ? `rgba(13, 110, 140, ${alpha})` : "#0d6e8c";
  }
  let c = hex.slice(1);
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(13, 110, 140, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Tutor sets this student may open. The list comes from /api/tutor/sets, which enforces the year / section lock.
export default function StudentTutorSets() {
  const router = useRouter();
  const [sets, setSets] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tutor/sets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setSets(d.sets || []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) {
    return (
      <div className="container p-5">
        <div className="clay-card p-5" style={{ padding: "48px 24px" }}>
          <div className="empty">
            <div className="clay-well" style={{ width: 48, height: 48, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Icon name="alert" size={22} style={{ color: "var(--warning)" }} />
            </div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>โหลดชุดติวไม่สำเร็จ</div>
            <div className="t-sm muted mt-1">กรุณาลองใหม่อีกครั้ง</div>
          </div>
        </div>
      </div>
    );
  }
  if (!sets) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <div className="mb-5 pt-2">
        <h1 className="t-2xl fw-7 serif" style={{ letterSpacing: "-.02em", margin: "0 0 6px" }}>ชุดติวของฉัน</h1>
        <p className="t-sm muted pretty" style={{ margin: 0, color: "#475569" }}>
          ทบทวนเนื้อหาและฝึกทำข้อสอบเป็นชุดต่อบท แยกจากรายวิชาปกติ
        </p>
      </div>

      {sets.length === 0 ? (
        <div className="clay-card" style={{ padding: "48px 24px" }}>
          <div className="empty">
            <div className="clay-well" style={{ width: 54, height: 54, display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Icon name="book" size={26} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <div className="fw-6 fg" style={{ fontSize: "16px" }}>ยังไม่มีชุดติวสำหรับคุณ</div>
              <div className="t-sm mt-1 muted" style={{ maxWidth: 420, margin: "6px auto 0" }}>
                เมื่ออาจารย์เปิดชุดติวให้ชั้นปีหรือกลุ่มเรียนของคุณ จะแสดงที่นี่
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-3 gap-4">
          {sets.map((c) => {
            const hero = c.hero && c.hero.startsWith("#") ? c.hero : "#0d6e8c";
            return (
              <div
                key={c.id}
                className="clay-card clay-card-interactive"
                style={{ display: "flex", flexDirection: "column" }}
                onClick={() => router.push("/s/tutor/" + c.id)}
              >
                <div className="card-p flex-1 flex col" style={{ padding: 22 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center" style={{ gap: 12 }}>
                      <div
                        className="clay-pod"
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          background: `linear-gradient(135deg, ${hexToRgba(hero, 0.16)} 0%, ${hexToRgba(hero, 0.07)} 100%)`,
                          border: `1.5px solid ${hexToRgba(hero, 0.28)}`,
                          color: hero,
                          boxShadow: `inset 1px 1px 2px rgba(255, 255, 255, 0.95), inset -1px -1px 2px ${hexToRgba(hero, 0.18)}, 0 3px 8px -2px ${hexToRgba(hero, 0.18)}`,
                        }}
                      >
                        <Icon name="sparkle" size={18} />
                      </div>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: hexToRgba(hero, 0.12),
                          color: hero,
                          border: `1px solid ${hexToRgba(hero, 0.25)}`,
                          boxShadow: "inset 1px 1px 2px rgba(255,255,255,.9)",
                        }}
                      >
                        {c.code}
                      </span>
                    </div>
                    <span className="clay-badge" style={{ color: "var(--muted-fg)", fontWeight: 600, fontSize: 11 }}>
                      ชุดติว
                    </span>
                  </div>
                  <div className="t-md fw-7 serif" style={{ letterSpacing: "-.01em", fontSize: 17, lineHeight: 1.4 }}>
                    {c.title}
                  </div>
                  <div className="muted t-sm mt-2 pretty flex-1" style={{ minHeight: 38, color: "#475569", lineHeight: 1.55 }}>
                    {c.subtitle}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(226,232,240,.6)" }}>
                    <span className="clay-badge clay-badge-primary">
                      <Icon name="book" size={13} />
                      {c.lessons} บท
                    </span>
                    <span className="clay-btn clay-btn-soft clay-btn-sm">
                      เปิดชุดติว
                      <Icon name="arrR" size={14} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
