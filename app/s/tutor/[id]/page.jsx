"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

// One tutor set: its lessons. Data from /api/tutor/sets/<id> (lock enforced there; never contains questions).
export default function StudentTutorSet() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const id = useParams()?.id;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch("/api/tutor/sets/" + encodeURIComponent(id), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [id]);

  if (missing) {
    return (
      <div className="container p-5">
        <div className="clay-card" style={{ padding: "48px 24px" }}>
          <div className="empty">
            <div className="clay-well" style={{ width: 48, height: 48, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Icon name="alert" size={22} style={{ color: "var(--warning)" }} />
            </div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบชุดติว</div>
            <div className="t-sm muted mt-1">ไม่พบชุดติวนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ</div>
            <button className="clay-btn clay-btn-soft clay-btn-sm mt-3" onClick={() => nav("/s/tutor")}>
              <Icon name="arrL" size={14} />กลับไปรายการชุดติว
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <Loading className="container p-5 text-center muted" />;

  const { set, lessons } = data;
  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <Crumb nav={nav} items={[{ label: "ชุดติวของฉัน", to: "/s/tutor" }, { label: set.code }]} />
      <div className="clay-card mb-5" style={{ overflow: "hidden", padding: 28 }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="clay-badge clay-badge-primary" style={{ fontWeight: 700 }}>
            {set.code}
          </span>
          <span className="clay-badge">
            ชุดติว
          </span>
        </div>
        <h1 className="t-2xl fw-7 serif" style={{ letterSpacing: "-.01em", margin: "0 0 6px" }}>
          {set.title}
        </h1>
        <div className="muted pretty" style={{ color: "#475569", lineHeight: 1.6 }}>
          {set.subtitle}
        </div>
        <div className="flex items-center gap-3 mt-4 t-sm muted wrap pt-3" style={{ borderTop: "1px solid rgba(226,232,240,.6)" }}>
          <span className="flex items-center gap-1.5" style={{ color: "#334155" }}>
            <Icon name="user" size={15} style={{ color: "var(--primary)" }} />
            {set.instructor}
          </span>
          <i className="dot-sep" />
          <span className="flex items-center gap-1.5" style={{ color: "#334155" }}>
            <Icon name="book" size={15} style={{ color: "var(--primary)" }} />
            {lessons.length} บท
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="t-md fw-7 m-0" style={{ fontSize: 16 }}>บทเรียนทั้งหมด</h2>
        <span className="t-xs muted">{lessons.length} บทเรียน</span>
      </div>

      {lessons.length === 0 ? (
        <div className="clay-card" style={{ padding: "40px 20px" }}>
          <div className="empty">
            <div className="t-sm muted">ชุดติวนี้ยังไม่มีบทที่เปิดให้ใช้งาน</div>
          </div>
        </div>
      ) : (
        <div className="flex col gap-3">
          {lessons.map((l) => (
            <div
              key={l.id}
              className="clay-card clay-card-interactive"
              style={{ display: "flex", alignItems: "center", padding: "12px 18px", gap: 16 }}
              onClick={() => nav("/s/tutor/lesson/" + l.id)}
            >
              <div
                className="clay-well"
                style={{
                  flex: "0 0 46px",
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 14,
                }}
              >
                <span className="t-base fw-7" style={{ color: "var(--primary)" }}>
                  {String(l.index ?? "").padStart(2, "0")}
                </span>
              </div>
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="fw-6 t-base truncate" style={{ color: "var(--fg)" }}>{l.title}</div>
                <div className="t-xs muted mt-1 flex items-center gap-2" style={{ color: "#64748b" }}>
                  <span className="flex items-center gap-1">
                    <Icon name={l.hasVideo ? "video" : "book"} size={13} style={{ color: l.hasVideo ? "var(--primary)" : "var(--muted-fg)" }} />
                    {l.hasVideo ? `มีวิดีโอ (${l.duration || "ไม่ระบุ"})` : "ไม่มีวิดีโอ"}
                  </span>
                </div>
              </div>
              <div
                className="clay-well"
                style={{
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 99,
                  flex: "0 0 32px",
                }}
              >
                <Icon name="chevR" size={16} style={{ color: "var(--primary)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
